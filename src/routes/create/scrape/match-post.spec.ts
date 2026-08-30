import { beforeEach, describe, expect, test, vi } from 'vitest';
import { App } from '../../../app';
import { aPlayer, aProposedDate, aSession } from '../../../lib/__test-utils__/builders';
import { hashPassword } from '../../../lib/crypto-utils';
import { fetchClubId, fetchVenues } from '../../../lib/click-tt-scraper';
import { LOCALE_KEY } from '../../../locales';
import { MemorySessionStore } from '../../../lib/session-store';
import { handleScrapeMatchPost } from './match-post';

vi.mock('../../../lib/click-tt-scraper', () => ({
  fetchPlayers: vi.fn(() => []),
  fetchClubId: vi.fn(() => undefined),
  fetchVenues: vi.fn(() => []),
}));

interface MockOptions {
  headers?: Record<string, string>;
  body?: Record<string, unknown>;
}

function createApp(options: MockOptions = {}): App {
  const {headers = {}, body = {}} = options;
  const store = new MemorySessionStore();
  const context = {
    get: (key: string): string | undefined => (key === LOCALE_KEY ? 'en-US' : undefined),
    req: {
      header: (name: string): string | undefined => headers[name],
      parseBody: (): Promise<Record<string, unknown>> => Promise.resolve(body),
    },
    redirect: vi.fn((url: string) => new Response(null, {status: 302, headers: {Location: url}})),
  } as any;

  return App.create(context, store);
}

const MATCH = {
  day: 'Sat.',
  date: '29.08.2026',
  time: '16:00',
  homeTeam: 'Thun',
  guestTeam: 'Ostermundigen',
  groupName: 'O40 1. Liga',
  leagueName: 'MTTV 2026/27',
  championship: 'MTTV 26/27',
  group: '219397',
  playerName: ['Linder, Christoph', 'Schmid, Oliver', 'Milcu, Sasha'],
  // opponentTeamtable left empty so fetchPlayers is not invoked (no network).
  opponentTeamtable: '',
};

async function storedSession(app: App): Promise<ReturnType<App['store']['get']>> {
  const response = await handleScrapeMatchPost(app);
  const location = response.headers.get('Location') ?? '';
  const id = /\/edit\/([^?]+)/.exec(location)?.[1] ?? '';
  return app.store.get(id);
}

describe('handleScrapeMatchPost', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('stores organizerTeam "home" when the organizer claims the home side', async () => {
    const app = createApp({body: {...MATCH, teamName: 'Thun'}});

    const stored = await storedSession(app);

    expect(stored?.organizerTeam)
      .toBe('home');
    expect(stored?.status)
      .toBe('Draft');
    expect(stored?.homeTeam)
      .toBe('Thun');
    expect(stored?.guestTeam)
      .toBe('Ostermundigen');
    expect(stored?.originalMatchDateTime)
      .toBe('2026-08-29T16:00');
    expect(stored?.name)
      .toBe('Thun vs Ostermundigen – 08/29/2026 04:00 pm');
    expect(stored?.players)
      .toMatchObject([
        {name: 'Linder, Christoph', teamId: 'home'},
        {name: 'Schmid, Oliver', teamId: 'home'},
        {name: 'Milcu, Sasha', teamId: 'home'},
      ]);
  });

  test('stores organizerTeam "away" when the organizer claims the guest side', async () => {
    const app = createApp({body: {...MATCH, teamName: 'Ostermundigen'}});

    const stored = await storedSession(app);

    expect(stored?.organizerTeam)
      .toBe('away');
    expect(stored?.players)
      .toMatchObject([
        {name: 'Linder, Christoph', teamId: 'away'},
        {name: 'Schmid, Oliver', teamId: 'away'},
        {name: 'Milcu, Sasha', teamId: 'away'},
      ]);
  });

  test('throws when a required match field is missing', async () => {
    const app = createApp({body: {...MATCH, teamName: 'Thun', date: ''}});

    await expect(handleScrapeMatchPost(app))
      .rejects
      .toThrow('Missing required parameter: match');
  });

  test('rejects when the organizer team name is absent instead of defaulting to away', async () => {
    const app = createApp({body: {...MATCH}});

    await expect(handleScrapeMatchPost(app))
      .rejects
      .toThrow('Missing required parameter: teamName');
  });

  test('rejects when the organizer team name is empty', async () => {
    const app = createApp({body: {...MATCH, teamName: ''}});

    await expect(handleScrapeMatchPost(app))
      .rejects
      .toThrow('Missing required parameter: teamName');
  });

  test('stores both teams\' click-tt identities when the organizer claims the home side', async () => {
    const app = createApp({
      body: {...MATCH, teamName: 'Thun', teamtable: 'tt-own', opponentTeamtable: 'tt-opp'},
    });

    const stored = await storedSession(app);

    expect(stored?.homeTeamIdentity)
      .toEqual({championship: 'MTTV 26/27', group: '219397', teamtable: 'tt-own'});
    expect(stored?.guestTeamIdentity)
      .toEqual({championship: 'MTTV 26/27', group: '219397', teamtable: 'tt-opp'});
  });

  test('swaps the identities when the organizer claims the guest side', async () => {
    const app = createApp({
      body: {...MATCH, teamName: 'Ostermundigen', teamtable: 'tt-own', opponentTeamtable: 'tt-opp'},
    });

    const stored = await storedSession(app);

    expect(stored?.homeTeamIdentity?.teamtable)
      .toBe('tt-opp');
    expect(stored?.guestTeamIdentity?.teamtable)
      .toBe('tt-own');
  });

  test('stores no identities when no teamtables are submitted', async () => {
    const app = createApp({body: {...MATCH, teamName: 'Thun', teamtable: ''}});

    const stored = await storedSession(app);

    expect(stored?.homeTeamIdentity)
      .toBeUndefined();
    expect(stored?.guestTeamIdentity)
      .toBeUndefined();
  });

  test('stores the scraped venues when the organizer team resolves a club id', async () => {
    vi.mocked(fetchClubId).mockResolvedValueOnce('33282');
    vi.mocked(fetchVenues).mockResolvedValueOnce([
      {venueNumber: 1, name: 'Turnhalle orange', address: 'Dennigkofenweg 169', postalCode: '3072', city: 'Ostermundigen'},
    ]);
    const app = createApp({body: {...MATCH, teamName: 'Thun', teamtable: 'tt-own'}});

    const stored = await storedSession(app);

    expect(fetchClubId)
      .toHaveBeenCalledWith('MTTV 26/27', '219397', 'tt-own');
    expect(stored?.venues)
      .toEqual([
        {venueNumber: 1, name: 'Turnhalle orange', address: 'Dennigkofenweg 169', postalCode: '3072', city: 'Ostermundigen'},
      ]);
  });

  test('keeps venues empty when no club id is resolvable', async () => {
    vi.mocked(fetchClubId).mockResolvedValueOnce(undefined);
    const app = createApp({body: {...MATCH, teamName: 'Thun', teamtable: 'tt-own'}});

    const stored = await storedSession(app);

    expect(fetchVenues)
      .not
      .toHaveBeenCalled();
    expect(stored?.venues)
      .toEqual([]);
  });

  test('keeps venues empty when no teamtable is submitted', async () => {
    const app = createApp({body: {...MATCH, teamName: 'Thun', teamtable: ''}});

    const stored = await storedSession(app);

    expect(fetchClubId)
      .not
      .toHaveBeenCalled();
    expect(stored?.venues)
      .toEqual([]);
  });
});

describe('handleScrapeMatchPost change mode (re-scrape)', () => {
  const ownerPassword = 'owner-secret';

  test('replaces the rosters in place, preserving id, passwords, votes, and proposed dates', async () => {
    const session = aSession({
      ownerPasswordHash: await hashPassword(ownerPassword),
      players: [aPlayer({id: 'old-p', name: 'Old Player'})],
      proposedDates: [aProposedDate()],
    });
    const app = createApp({body: {...MATCH, teamName: 'Thun', sessionId: session.id, ownerPassword}});
    await app.store.save(session);

    await handleScrapeMatchPost(app);

    const stored = await app.store.get(session.id);
    expect(stored?.id).toBe(session.id);
    expect(stored?.name).toBe('Thun vs Ostermundigen – 08/29/2026 04:00 pm');
    expect(stored?.homeTeam).toBe('Thun');
    expect(stored?.guestTeam).toBe('Ostermundigen');
    expect(stored?.originalMatchDateTime).toBe('2026-08-29T16:00');
    expect(stored?.players.map((p) => p.name))
      .toEqual(['Linder, Christoph', 'Schmid, Oliver', 'Milcu, Sasha']);
    expect(stored?.players.every((p) => p.teamId === 'home'))
      .toBe(true);
    expect(stored?.organizerTeam)
      .toBe('home');
    expect(stored?.ownerPasswordHash).toBe(session.ownerPasswordHash);
    expect(stored?.proposedDates).toEqual(session.proposedDates);
    expect(stored?.votes).toEqual(session.votes);
    // A session without identity fields stays without them (backwards compatible).
    expect(stored?.homeTeamIdentity).toBeUndefined();
    expect(stored?.guestTeamIdentity).toBeUndefined();
  });

  test('re-scrape replaces the stored team identities', async () => {
    const session = aSession({
      ownerPasswordHash: await hashPassword(ownerPassword),
      homeTeamIdentity: {championship: 'Old', group: 'Old', teamtable: 'old-1'},
      guestTeamIdentity: {championship: 'Old', group: 'Old', teamtable: 'old-2'},
    });
    const app = createApp({
      body: {
        ...MATCH,
        teamName: 'Thun',
        sessionId: session.id,
        ownerPassword,
        teamtable: 'tt-own',
        opponentTeamtable: 'tt-opp',
      },
    });
    await app.store.save(session);

    await handleScrapeMatchPost(app);

    const stored = await app.store.get(session.id);
    expect(stored?.homeTeamIdentity)
      .toEqual({championship: 'MTTV 26/27', group: '219397', teamtable: 'tt-own'});
    expect(stored?.guestTeamIdentity)
      .toEqual({championship: 'MTTV 26/27', group: '219397', teamtable: 'tt-opp'});
  });

  test('rejects a wrong owner password', async () => {
    const session = aSession({ownerPasswordHash: await hashPassword('real-pw')});
    const app = createApp({body: {...MATCH, teamName: 'Thun', sessionId: session.id, ownerPassword: 'wrong'}});
    await app.store.save(session);

    await expect(handleScrapeMatchPost(app))
      .rejects
      .toThrow('Invalid owner password.');
  });

  test('throws when the session does not exist', async () => {
    const app = createApp({body: {...MATCH, teamName: 'Thun', sessionId: 'missing', ownerPassword}});

    await expect(handleScrapeMatchPost(app))
      .rejects
      .toThrow('Session not found');
  });
});