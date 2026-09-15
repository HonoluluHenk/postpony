import { beforeEach, describe, expect, test, vi } from 'vitest';
import { App } from '../../../app';
import { aPlayer, aProposedDate, aSession } from '../../../lib/__test-utils__/builders';
import { createApp } from '../../../lib/__test-utils__/create-app';
import { fetchClubId, fetchPlayers, fetchVenues } from '../../../lib/click-tt-scraper';
import { hashPassword, comparePassword } from '../../../lib/crypto-utils';
import { DEFAULT_CLUB_ID } from '../../../lib/models';
import { handleScrapeMatchPost } from './match-post';

vi.mock('../../../lib/click-tt-scraper', () => ({
  fetchPlayers: vi.fn(() => []),
  fetchClubId: vi.fn(() => undefined),
  fetchVenues: vi.fn(() => []),
}));

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

  test('mints four distinct secrets: hashes all four and persists the three shareable plaintexts', async () => {
    const app = createApp({body: {...MATCH, teamName: 'Thun'}});

    const stored = await storedSession(app);

    expect(stored?.organizerCaptainPasswordHash)
      .toBeTruthy();
    expect(stored?.opponentCaptainPasswordHash)
      .toBeTruthy();
    expect(stored?.homePlayerPasswordHash)
      .toBeTruthy();
    expect(stored?.awayPlayerPasswordHash)
      .toBeTruthy();

    const hashes = new Set([
      stored?.organizerCaptainPasswordHash,
      stored?.opponentCaptainPasswordHash,
      stored?.homePlayerPasswordHash,
      stored?.awayPlayerPasswordHash,
    ]);
    expect(hashes.size)
      .toBe(4);

    expect(stored?.opponentCaptainPassword)
      .toBeTruthy();
    expect(stored?.homePlayerPassword)
      .toBeTruthy();
    expect(stored?.awayPlayerPassword)
      .toBeTruthy();

    // Each shareable plaintext hashes to its stored hash.
    await expect(comparePassword(stored?.opponentCaptainPassword ?? '', stored?.opponentCaptainPasswordHash ?? ''))
      .resolves
      .toBe(true);
    await expect(comparePassword(stored?.homePlayerPassword ?? '', stored?.homePlayerPasswordHash ?? ''))
      .resolves
      .toBe(true);
    await expect(comparePassword(stored?.awayPlayerPassword ?? '', stored?.awayPlayerPasswordHash ?? ''))
      .resolves
      .toBe(true);

    // The organizer-captain plaintext is never persisted on the session.
    expect(stored)
      .not
      .toHaveProperty('organizerPassword');
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

  test('stores the scraped venues and home club id when the team page resolves one', async () => {
    vi.mocked(fetchClubId)
      .mockResolvedValueOnce('33132');
    vi.mocked(fetchVenues)
      .mockResolvedValueOnce([
        {
          venueNumber: 1,
          name: 'Turnhalle orange',
          shortName: 'Turnhalle orange',
          address: 'Dennigkofenweg 169',
          postalCode: '3072',
          city: 'Ostermundigen',
        },
      ]);
    const app = createApp({body: {...MATCH, teamName: 'Thun', teamtable: 'tt-own'}});

    const stored = await storedSession(app);

    expect(fetchClubId)
      .toHaveBeenCalledWith('MTTV 26/27', '219397', 'tt-own', {
        date: '29.08.2026',
        time: '16:00',
        homeTeam: 'Thun',
        guestTeam: 'Ostermundigen',
      });
    expect(stored?.clubId)
      .toBe('33132');
    expect(stored?.venues)
      .toEqual([
        {
          venueNumber: 1,
          name: 'Turnhalle orange',
          shortName: 'Turnhalle orange',
          address: 'Dennigkofenweg 169',
          postalCode: '3072',
          city: 'Ostermundigen',
        },
      ]);
  });

  test('keeps venues empty and clubId unset when no club id is resolvable', async () => {
    vi.mocked(fetchClubId)
      .mockResolvedValueOnce(undefined);
    const app = createApp({body: {...MATCH, teamName: 'Thun', teamtable: 'tt-own'}});

    const stored = await storedSession(app);

    expect(fetchVenues)
      .not
      .toHaveBeenCalled();
    expect(stored?.venues)
      .toEqual([]);
    expect(stored?.clubId)
      .toBe(DEFAULT_CLUB_ID);
  });

  test('keeps venues empty when no teamtable is submitted', async () => {
    const app = createApp({body: {...MATCH, teamName: 'Thun', teamtable: ''}});

    const stored = await storedSession(app);

    expect(fetchClubId)
      .not
      .toHaveBeenCalled();
    expect(stored?.venues)
      .toEqual([]);
    expect(stored?.clubId)
      .toBe(DEFAULT_CLUB_ID);
  });

  test('accepts a single-string playerName and mixes in the scraped opponent roster', async () => {
    vi.mocked(fetchPlayers)
      .mockResolvedValueOnce([{name: 'Widmer, Hans'}]);
    const app = createApp({
      body: {...MATCH, teamName: 'Thun', playerName: 'Linder, Christoph', opponentTeamtable: 'tt-opp'},
    });

    const stored = await storedSession(app);

    expect(fetchPlayers)
      .toHaveBeenCalledWith('MTTV 26/27', '219397', 'tt-opp');
    expect(stored?.players)
      .toMatchObject([
        {name: 'Linder, Christoph', teamId: 'home'},
        {name: 'Widmer, Hans', teamId: 'away'},
      ]);
  });

  test('accepts an empty playerName list without crashing', async () => {
    const app = createApp({body: {...MATCH, teamName: 'Thun', playerName: []}});

    const stored = await storedSession(app);

    expect(stored?.players)
      .toEqual([]);
  });
});

describe('handleScrapeMatchPost ignores leftover change parameters', () => {
  const organizerPassword = 'organizer-secret';

  test('carrying sessionId/organizerPassword mints a fresh Postponement and never mutates the referenced one', async () => {
    const session = aSession({
      organizerCaptainPasswordHash: await hashPassword(organizerPassword),
      players: [aPlayer({id: 'old-p', name: 'Old Player'})],
      proposedDates: [aProposedDate()],
    });
    const app = createApp({body: {...MATCH, teamName: 'Thun', sessionId: session.id, organizerPassword}});
    await app.store.save(session);

    const response = await handleScrapeMatchPost(app);
    const location = response.headers.get('Location') ?? '';
    const mintedId = /\/edit\/([^?]+)/.exec(location)?.[1] ?? '';

    const existing = await app.store.get(session.id);
    // The referenced Postponement is untouched.
    expect(existing)
      .toMatchObject({
        id: session.id,
        name: session.name,
        homeTeam: session.homeTeam,
        guestTeam: session.guestTeam,
        organizerCaptainPasswordHash: session.organizerCaptainPasswordHash,
        proposedDates: session.proposedDates,
        votes: session.votes,
      });
    expect(existing?.players)
      .toEqual(session.players);

    const minted = await app.store.get(mintedId);
    // A brand-new Postponement was minted with a new id.
    expect(minted?.id)
      .toBeDefined();
    expect(minted?.id)
      .not
      .toBe(session.id);
    expect(minted?.organizerCaptainPasswordHash)
      .not
      .toBe(session.organizerCaptainPasswordHash);
    expect(minted?.name)
      .toBe('Thun vs Ostermundigen – 08/29/2026 04:00 pm');
    expect(minted?.homeTeam)
      .toBe('Thun');
    expect(minted?.guestTeam)
      .toBe('Ostermundigen');
  });

  test('a wrong organizer password does not block the mint', async () => {
    const session = aSession({organizerCaptainPasswordHash: await hashPassword('real-pw')});
    const app = createApp({body: {...MATCH, teamName: 'Thun', sessionId: session.id, organizerPassword: 'wrong'}});
    await app.store.save(session);

    const minted = await storedSession(app);

    expect(minted?.id)
      .not
      .toBe(session.id);
    const existing = await app.store.get(session.id);
    expect(existing?.name)
      .toBe(session.name);
  });

  test('a missing session does not block the mint', async () => {
    const app = createApp({body: {...MATCH, teamName: 'Thun', sessionId: 'missing', organizerPassword}});

    const minted = await storedSession(app);

    expect(minted?.id)
      .toBeDefined();
    expect(minted?.homeTeam)
      .toBe('Thun');
  });

  test('an HTMX partial submission returns 200 with HX-Redirect instead of a 302', async () => {
    const app = createApp({headers: {'HX-Request': 'true'}, body: {...MATCH, teamName: 'Thun'}});

    const response = await handleScrapeMatchPost(app);

    expect(response.status)
      .toBe(200);
    expect(response.headers.get('HX-Redirect'))
      .toMatch(/^\/edit\/[^?]+\?organizerPassword=/);
  });
});
