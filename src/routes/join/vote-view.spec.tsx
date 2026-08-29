import { describe, expect, test, vi } from 'vitest';
import { App } from '../../app';
import { aPlayer, aProposedDate, aSession, aVote } from '../../lib/__test-utils__/builders';
import { LOCALE_KEY } from '../../locales';
import { MemorySessionStore } from '../../lib/session-store';
import {
  buildPlayerVoteRows,
  renderConfirmedInfo,
  renderVoteStep,
  visibleDatesForTeam,
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

describe('visibleDatesForTeam', () => {
  test('home team sees every proposed date', () => {
    const session = aSession({
      proposedDates: [
        aProposedDate({id: 'date-1', votableByOpponent: false}),
        aProposedDate({id: 'date-2', votableByOpponent: true}),
      ],
    });

    expect(visibleDatesForTeam(session, 'home').map((pd) => pd.id))
      .toEqual(['date-1', 'date-2']);
  });

  test('away team only sees dates the organizer proposed to them', () => {
    const session = aSession({
      proposedDates: [
        aProposedDate({id: 'date-1', votableByOpponent: false}),
        aProposedDate({id: 'date-2', votableByOpponent: true}),
      ],
    });

    expect(visibleDatesForTeam(session, 'away').map((pd) => pd.id))
      .toEqual(['date-2']);
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
      proposedDates: [aProposedDate({votableByOpponent: true})],
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

  test('renders the pre-proposal empty state when the team has no votable dates', async () => {
    const player = aPlayer({teamId: 'away'});
    const session = aSession({
      status: 'Draft',
      players: [player],
      proposedDates: [aProposedDate({votableByOpponent: false})],
    });
    const app = createApp();
    await app.store.save(session);

    const response = renderVoteStep(app, {
      session,
      team: 'away',
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
          votableByOpponent: true,
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
          votableByOpponent: true,
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
          votableByOpponent: true,
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
      proposedDates: [aProposedDate({votableByOpponent: true})],
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
      proposedDates: [aProposedDate({votableByOpponent: true})],
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
          votableByOpponent: true,
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
