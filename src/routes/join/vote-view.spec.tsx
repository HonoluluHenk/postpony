import { describe, expect, test, vi } from 'vitest';
import { App } from '../../app';
import { aPlayer, aProposedDate, aSession, aVote } from '../../lib/__test-utils__/builders';
import { LOCALE_KEY } from '../../locales';
import { MemorySessionStore } from '../../lib/session-store';
import { formatProposedDateDisplay } from '../../lib/temporal-utils';
import {
  buildPlayerVoteRows,
  renderConfirmedInfo,
  renderVoteStep,
} from './vote-view';

function createApp(locale = 'en-US'): App {
  const store = new MemorySessionStore();
  const context = {
    get: (key: string): string | undefined => (key === LOCALE_KEY ? locale : undefined),
    req: {
      param: (): string | undefined => undefined,
      query: (): string | undefined => undefined,
      header: (): string | undefined => undefined,
      url: 'https://game-scheduler.localhost:3000/',
    },
    html: vi.fn((content: string) => new Response(content)),
  } as any;

  return App.create(context, store);
}

describe('renderVoteStep date visibility', () => {
  test.each(['home', 'away'] as const)('%s team sees every date when all are votable', async (team) => {
    const player = aPlayer({teamId: team});
    const session = aSession({
      status: 'Voting',
      players: [player],
      proposedDates: [
        aProposedDate({id: 'date-1', votable: true}),
        aProposedDate({id: 'date-2', votable: true}),
      ],
    });
    const app = createApp();
    await app.store.save(session);

    const response = renderVoteStep(app, {
      session,
      team,
      token: 'token',
      player,
    });
    const body = await response.text();

    expect(body)
      .toContain('name="vote-date-1"');
    expect(body)
      .toContain('name="vote-date-2"');
  });

  test.each(['home', 'away'] as const)('hides a closed date from the %s team poll', async (team) => {
    const player = aPlayer({teamId: team});
    const session = aSession({
      status: 'Voting',
      players: [player],
      proposedDates: [
        aProposedDate({id: 'date-1', votable: true}),
        aProposedDate({id: 'date-2', votable: false}),
      ],
    });
    const app = createApp();
    await app.store.save(session);

    const response = renderVoteStep(app, {
      session,
      team,
      token: 'token',
      player,
    });
    const body = await response.text();

    expect(body)
      .toContain('name="vote-date-1"');
    expect(body)
      .not
      .toContain('name="vote-date-2"');
  });

  test.each(['home', 'away'] as const)('renders the empty-state hint for the %s team when no dates are votable', async (team) => {
    const player = aPlayer({teamId: team});
    const session = aSession({
      status: 'Draft',
      players: [player],
      proposedDates: [aProposedDate({votable: false})],
    });
    const app = createApp();
    await app.store.save(session);

    const response = renderVoteStep(app, {
      session,
      team,
      token: 'token',
      player,
    });
    const body = await response.text();

    expect(body)
      .toContain('No dates have been proposed yet');
    expect(body)
      .not
      .toContain('name="vote-');
    expect(body)
      .not
      .toContain("Your Team's Votes");
  });
});

describe('buildPlayerVoteRows', () => {
  const dates = [
    aProposedDate({id: 'date-1'}),
    aProposedDate({id: 'date-2'}),
  ];

  test('home voter sees only home player names', () => {
    const session = aSession({
      players: [
        aPlayer({id: 'home-1', name: 'Alice', teamId: 'home'}),
        aPlayer({id: 'away-1', name: 'Bob', teamId: 'away'}),
      ],
    });

    const rows = buildPlayerVoteRows(session, 'home', dates);

    expect(rows.map((row) => row.playerName))
      .toEqual(['Alice']);
  });

  test('away voter sees only away player names', () => {
    const session = aSession({
      players: [
        aPlayer({id: 'home-1', name: 'Alice', teamId: 'home'}),
        aPlayer({id: 'away-1', name: 'Bob', teamId: 'away'}),
        aPlayer({id: 'away-2', name: 'Carol', teamId: 'away'}),
      ],
    });

    const rows = buildPlayerVoteRows(session, 'away', dates);

    expect(rows.map((row) => row.playerName))
      .toEqual(['Bob', 'Carol']);
  });

  test('a player without a vote shows null for that date', () => {
    const session = aSession({
      players: [
        aPlayer({id: 'home-1', name: 'Alice', teamId: 'home'}),
      ],
      votes: [
        aVote({participantId: 'home-1', proposedDateId: 'date-1', type: 'Yes'}),
      ],
    });

    const rows = buildPlayerVoteRows(session, 'home', dates);

    expect(rows[0]?.votes)
      .toEqual(['Yes', null]);
  });

  test('votes align with their date position', () => {
    const session = aSession({
      players: [
        aPlayer({id: 'home-1', name: 'Alice', teamId: 'home'}),
      ],
      votes: [
        aVote({participantId: 'home-1', proposedDateId: 'date-2', type: 'Maybe'}),
      ],
    });

    const rows = buildPlayerVoteRows(session, 'home', dates);

    expect(rows[0]?.votes)
      .toEqual([null, 'Maybe']);
  });

  test('re-voting updates the cell in place', () => {
    const session = aSession({
      players: [
        aPlayer({id: 'home-1', name: 'Alice', teamId: 'home'}),
      ],
      votes: [
        aVote({participantId: 'home-1', proposedDateId: 'date-1', type: 'No'}),
      ],
    });

    const rows = buildPlayerVoteRows(session, 'home', dates);

    expect(rows[0]?.votes)
      .toEqual(['No', null]);
  });

  test('returns an empty list when the team has no players', () => {
    const session = aSession({players: []});

    expect(buildPlayerVoteRows(session, 'home', dates))
      .toEqual([]);
  });
});

describe('renderVoteStep', () => {
  test('renders the vote form with the current vote checked and the shared tally at its heading levels', async () => {
    const player = aPlayer({id: 'player-1', name: 'Alice'});
    const session = aSession({
      status: 'Voting',
      players: [player],
      proposedDates: [aProposedDate({votable: true})],
      votes: [aVote({participantId: 'player-1', proposedDateId: 'proposed-date-1', type: 'Yes'})],
    });
    const app = createApp();
    await app.store.save(session);

    const response = renderVoteStep(app, {
      session,
      team: 'home',
      token: 'token',
      player,
      updated: true,
    });
    const body = await response.text();

    expect(body)
      .toContain('Vote on Proposed Dates');
    expect(body)
      .toContain('Your votes have been saved!');
    expect(body)
      .toContain('name="vote-proposed-date-1"');
    expect(body)
      .toContain('value="Yes" checked=""');
    expect(body)
      .toContain('Alice');
    expect(body)
      .toContain('<h3 id="vote-results-title">Your Team&#39;s Votes</h3>');
    expect(body)
      .toContain('<h4 id="vote-tally-title">Vote Summary</h4>');
  });

  test('renders the votable dates chronologically and keeps the results table aligned', async () => {
    const player = aPlayer({id: 'player-1', name: 'Alice'});
    const session = aSession({
      status: 'Voting',
      players: [player],
      proposedDates: [
        aProposedDate({id: 'date-later', dateTimeRange: {start: '2026-09-12T18:00'}}),
        aProposedDate({id: 'date-earlier', dateTimeRange: {start: '2026-09-05T18:00'}}),
      ],
      votes: [
        aVote({proposedDateId: 'date-earlier', participantId: 'player-1', type: 'Yes'}),
        aVote({proposedDateId: 'date-later', participantId: 'player-1', type: 'Maybe'}),
      ],
    });
    const app = createApp();
    await app.store.save(session);

    const response = renderVoteStep(app, {
      session,
      team: 'home',
      token: 'token',
      player,
    });
    const body = await response.text();

    const earlier = formatProposedDateDisplay('2026-09-05T18:00', 'en-US');
    const later = formatProposedDateDisplay('2026-09-12T18:00', 'en-US');

    const earlierRadio = body.indexOf('name="vote-date-earlier"');
    const laterRadio = body.indexOf('name="vote-date-later"');
    expect(earlierRadio)
      .toBeGreaterThan(0);
    expect(laterRadio)
      .toBeGreaterThan(earlierRadio);

    expect(body.indexOf(`data-label="${earlier}">Yes</td>`))
      .toBeLessThan(body.indexOf(`data-label="${later}">Maybe</td>`));
  });

  test('renders the confirmed-info view when the session is Confirmed', async () => {
    const player = aPlayer();
    const session = aSession({
      status: 'Confirmed',
      confirmedProposedDateId: 'proposed-date-1',
      reopenCount: 1,
      players: [player],
      proposedDates: [aProposedDate()],
    });
    const app = createApp();
    await app.store.save(session);

    const response = renderVoteStep(app, {
      session,
      team: 'home',
      token: 'token',
      player,
    });
    const body = await response.text();

    expect(body)
      .toContain('Postponement Confirmed');
    expect(body)
      .toContain('Voting is closed');
    expect(body)
      .toContain('Sep 1, 2025');
    expect(body)
      .not
      .toContain('name="vote-');
  });

  test('renders dates in the locale input format for de-CH', async () => {
    const player = aPlayer();
    const session = aSession({
      status: 'Voting',
      players: [player],
      proposedDates: [aProposedDate()],
    });
    const app = createApp('de-CH');
    await app.store.save(session);

    const response = renderVoteStep(app, {
      session,
      team: 'home',
      token: 'token',
      player,
    });
    const body = await response.text();

    expect(body)
      .toContain('01.09.2025');
    expect(body)
      .toContain('20:00');
    expect(body)
      .not
      .toContain('Sep 1, 2025');
  });

  test('renders the venue badge next to each proposed date in the poll', async () => {
    const player = aPlayer();
    const session = aSession({
      status: 'Voting',
      venues: [
        {venueNumber: 1, name: 'Turnhalle orange', address: 'Dennigkofenweg 169', postalCode: '3072', city: 'Ostermundigen'},
        {venueNumber: 2, name: 'Turnhalle grün', address: 'Dennigkofenweg 170', postalCode: '3072', city: 'Ostermundigen'},
      ],
      players: [player],
      proposedDates: [
        aProposedDate({id: 'date-1', venueNumber: 2, votable: true}),
        // legacy date without a stored venue number defaults to the V1 badge
        {...aProposedDate({id: 'date-2', votable: true}), venueNumber: undefined},
      ],
    });
    const app = createApp();
    await app.store.save(session);

    const response = renderVoteStep(app, {
      session,
      team: 'home',
      token: 'token',
      player,
    });
    const body = await response.text();

    expect(body)
      .toContain('>V2</span>');
    expect(body)
      .toContain('title="2 – Turnhalle grün"');
    expect(body)
      .toContain('>V1</span>');
  });

  test('renders the venue badge tooltip with just the number when no venue name is known', async () => {
    const player = aPlayer();
    const session = aSession({
      status: 'Voting',
      players: [player],
      proposedDates: [
        aProposedDate({id: 'date-1', votable: true, venueNumber: 4}),
      ],
    });
    const app = createApp();
    await app.store.save(session);

    const response = renderVoteStep(app, {
      session,
      team: 'home',
      token: 'token',
      player,
    });
    const body = await response.text();

    expect(body)
      .toContain('title="4"');
    expect(body)
      .toContain('>V4</span>');
  });
});

describe('renderVoteStep clash info', () => {
  test('renders one line per affected team with the localized time and opponent', async () => {
    const player = aPlayer();
    const session = aSession({
      status: 'Voting',
      homeTeamIdentity: {championship: 'MTTV 2026/27', group: '1. Liga', teamtable: 't1'},
      guestTeamIdentity: {championship: 'MTTV 2026/27', group: '1. Liga', teamtable: 't2'},
      players: [player],
      proposedDates: [
        aProposedDate({
          votable: true,
          clashes: {
            home: [{opponent: 'Thun', start: '2025-09-01T17:00'}],
            away: [{opponent: 'Burgdorf', start: '2025-09-01T21:30'}],
          },
        }),
      ],
    });
    const app = createApp();
    await app.store.save(session);

    const response = renderVoteStep(app, {
      session,
      team: 'home',
      token: 'token',
      player,
    });
    const body = await response.text();

    expect(body)
      .toContain('Home: 5:00 PM vs Thun');
    expect(body)
      .toContain('Away: 9:30 PM vs Burgdorf');
  });

  test('renders the 24-hour localized clash time for de-CH', async () => {
    const player = aPlayer();
    const session = aSession({
      status: 'Voting',
      homeTeamIdentity: {championship: 'MTTV 2026/27', group: '1. Liga', teamtable: 't1'},
      guestTeamIdentity: {championship: 'MTTV 2026/27', group: '1. Liga', teamtable: 't2'},
      players: [player],
      proposedDates: [
        aProposedDate({
          votable: true,
          clashes: {home: [{opponent: 'Thun', start: '2025-09-01T17:00'}], away: []},
        }),
      ],
    });
    const app = createApp('de-CH');
    await app.store.save(session);

    const response = renderVoteStep(app, {
      session,
      team: 'home',
      token: 'token',
      player,
    });
    const body = await response.text();

    expect(body)
      .toContain('Heim: 17:00 gegen Thun');
  });

  test('renders "checked, no clashes" when a check ran clean', async () => {
    const player = aPlayer();
    const session = aSession({
      status: 'Voting',
      homeTeamIdentity: {championship: 'MTTV 2026/27', group: '1. Liga', teamtable: 't1'},
      guestTeamIdentity: {championship: 'MTTV 2026/27', group: '1. Liga', teamtable: 't2'},
      players: [player],
      proposedDates: [
        aProposedDate({
          votable: true,
          clashes: {home: [], away: []},
        }),
      ],
    });
    const app = createApp();
    await app.store.save(session);

    const response = renderVoteStep(app, {
      session,
      team: 'home',
      token: 'token',
      player,
    });
    const body = await response.text();

    expect(body)
      .toContain('Schedule checked, no clashes');
  });

  test('renders "not checked" for a hand-entered match without team identities', async () => {
    const player = aPlayer();
    const session = aSession({
      status: 'Voting',
      players: [player],
      proposedDates: [aProposedDate({votable: true})],
    });
    const app = createApp();
    await app.store.save(session);

    const response = renderVoteStep(app, {
      session,
      team: 'home',
      token: 'token',
      player,
    });
    const body = await response.text();

    expect(body)
      .toContain('Not checked');
  });

  test('renders nothing when the check failed (identities exist, no clash data)', async () => {
    const player = aPlayer();
    const session = aSession({
      status: 'Voting',
      homeTeamIdentity: {championship: 'MTTV 2026/27', group: '1. Liga', teamtable: 't1'},
      guestTeamIdentity: {championship: 'MTTV 2026/27', group: '1. Liga', teamtable: 't2'},
      players: [player],
      proposedDates: [aProposedDate({votable: true})],
    });
    const app = createApp();
    await app.store.save(session);

    const response = renderVoteStep(app, {
      session,
      team: 'home',
      token: 'token',
      player,
    });
    const body = await response.text();

    expect(body)
      .not
      .toContain('Not checked');
    expect(body)
      .not
      .toContain('Schedule checked, no clashes');
    expect(body)
      .not
      .toContain('vs ');
  });

  test('clash lines do not disturb the voting radios', async () => {
    const player = aPlayer();
    const session = aSession({
      status: 'Voting',
      homeTeamIdentity: {championship: 'MTTV 2026/27', group: '1. Liga', teamtable: 't1'},
      guestTeamIdentity: {championship: 'MTTV 2026/27', group: '1. Liga', teamtable: 't2'},
      players: [player],
      proposedDates: [
        aProposedDate({
          votable: true,
          clashes: {home: [{opponent: 'Thun', start: '2025-09-01T17:00'}], away: []},
        }),
      ],
    });
    const app = createApp();
    await app.store.save(session);

    const response = renderVoteStep(app, {
      session,
      team: 'home',
      token: 'token',
      player,
    });
    const body = await response.text();

    expect(body)
      .toContain('name="vote-proposed-date-1"');
    expect(body)
      .toContain('value="Yes"');
    expect(body)
      .toContain('value="Maybe"');
    expect(body)
      .toContain('value="No"');
  });
});

describe('renderConfirmedInfo', () => {
  test('renders the confirmed date chip and hides the reopen count when it is zero', async () => {
    const session = aSession({
      status: 'Confirmed',
      confirmedProposedDateId: 'proposed-date-1',
      proposedDates: [aProposedDate()],
    });
    const app = createApp();

    const response = renderConfirmedInfo(app, session);
    const body = await response.text();

    expect(body)
      .toContain('Postponement Confirmed');
    expect(body)
      .toContain('Sep 1, 2025');
    expect(body)
      .not
      .toContain('Reopened');
  });
});
