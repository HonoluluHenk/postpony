import { describe, expect, test, vi } from 'vitest';
import { App } from '../../app';
import { aPlayer, aProposedDate, aSession, aVote } from '../../lib/__test-utils__/builders';
import { MemorySessionStore } from '../../lib/session-store';
import { formatProposedDateDisplay } from '../../lib/temporal-utils';
import { LOCALE_KEY } from '../../locales';
import { renderConfirmedInfo, renderVoteStep } from './vote-view';

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

  test.each([
    'home',
    'away',
  ] as const)('renders the empty-state hint for the %s team when no dates are votable', async (team) => {
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
      .toContain('Vote Summary');
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
      .toContain('<h3 id="vote-summary-title">Vote Summary</h3>');
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

    expect(body.indexOf(`>${earlier}</td>`))
      .toBeLessThan(body.indexOf(`>${later}</td>`));
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

  test('renders the venue number and short name inside the vote page\'s venue pill', async () => {
    const player = aPlayer();
    const session = aSession({
      status: 'Voting',
      venues: [
        {
          venueNumber: 1,
          name: 'Turnhalle orange',
          shortName: 'Turnhalle orange',
          address: 'Dennigkofenweg 169',
          postalCode: '3072',
          city: 'Ostermundigen',
        },
        {
          venueNumber: 2,
          name: 'Turnhalle grün',
          shortName: 'Turnhalle grün',
          address: 'Dennigkofenweg 170',
          postalCode: '3072',
          city: 'Ostermundigen',
        },
      ],
      players: [player],
      proposedDates: [
        aProposedDate({id: 'date-1', venueNumber: 2, votable: true}),
        // legacy date without a stored venue number defaults to the (1) badge
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
      .toContain('>(2) – Turnhalle grün</span></legend>');
    expect(body)
      .toContain('>(1) – Turnhalle orange</span></legend>');
  });

  test('renders just the venue number in the pill when no venue name is known', async () => {
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
      .toContain('>(4)</span></legend>');
  });

  test('truncates a multi-line venue name at the first comma in the vote pill', async () => {
    const player = aPlayer();
    const session = aSession({
      status: 'Voting',
      venues: [
        {
          venueNumber: 1,
          name: 'Turnhalle orange, UG, Schule Dennigkofen',
          shortName: 'Turnhalle orange',
          address: 'Dennigkofenweg 169',
          postalCode: '3072',
          city: 'Ostermundigen',
        },
      ],
      players: [player],
      proposedDates: [
        aProposedDate({id: 'date-1', votable: true, venueNumber: 1}),
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

    // Visible pill text is the first comma-segment; the pill's tooltip keeps the full name.
    expect(body)
      .toContain('>(1) – Turnhalle orange</span></legend>');
    expect(body)
      .toContain('title="1 – Turnhalle orange, UG, Schule Dennigkofen"');
    expect(body)
      .not
      .toContain('Schule Dennigkofen</span>');
  });
});

describe('renderVoteStep hides clash info', () => {
  test('renders no clash lines for a date with home and away clashes', async () => {
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
      .not
      .toContain('Home: 5:00 PM vs Thun');
    expect(body)
      .not
      .toContain('Away: 9:30 PM vs Burgdorf');
    expect(body)
      .not
      .toContain('vs ');
  });

  test('renders no clean-check chip when a check ran clean', async () => {
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
      .not
      .toContain('Schedule checked, no clashes');
  });

  test('renders no "not checked" chip for a hand-entered match without team identities', async () => {
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
      .not
      .toContain('Not checked');
  });

  test('a clashing date the organizer re-enabled still renders its vote radios', async () => {
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

describe('renderVoteStep venue occupancy info', () => {
  test('renders the occupancy count beside the venue in the legend', async () => {
    const player = aPlayer();
    const session = aSession({
      status: 'Voting',
      venues: [
        {
          venueNumber: 1,
          name: 'Turnhalle orange',
          shortName: 'Turnhalle orange',
          address: 'Dennigkofenweg 169',
          postalCode: '3072',
          city: 'Ostermundigen',
        },
      ],
      players: [player],
      proposedDates: [
        aProposedDate({
          votable: true,
          venueOccupancy: {
            count: 2,
            matches: [
              {opponent: 'Port', start: '2025-09-01T20:15'},
              {opponent: 'Bern', start: '2025-09-01T19:30'},
            ],
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
      .toContain('>(1) – Turnhalle orange, 2 other games</span></legend>');
    expect(body)
      .not
      .toContain('2 other games at this venue');
  });

  test('renders no occupancy button or tooltip on the vote page', async () => {
    const player = aPlayer();
    const session = aSession({
      status: 'Voting',
      players: [player],
      proposedDates: [
        aProposedDate({
          votable: true,
          venueOccupancy: {count: 2, matches: [{opponent: 'Port', start: '2025-09-01T20:15'}]},
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
      .not
      .toContain('role="tooltip"');
    expect(body)
      .not
      .toContain('data-occupancy-trigger');
    expect(body)
      .not
      .toContain('aria-describedby');
  });

  test('omits the count clause from the legend when the occupancy check ran clean', async () => {
    const player = aPlayer();
    const session = aSession({
      status: 'Voting',
      venues: [
        {
          venueNumber: 1,
          name: 'Turnhalle orange',
          shortName: 'Turnhalle orange',
          address: 'Dennigkofenweg 169',
          postalCode: '3072',
          city: 'Ostermundigen',
        },
      ],
      players: [player],
      proposedDates: [
        aProposedDate({
          votable: true,
          venueOccupancy: {count: 0, matches: []},
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
      .toContain('>(1) – Turnhalle orange</span></legend>');
    expect(body)
      .not
      .toContain('other games');
    expect(body)
      .not
      .toContain('Venue checked');
  });

  test('omits the count clause when occupancy data is absent (hand-entered match or failed scrape)', async () => {
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
      .not
      .toContain('other games');
    expect(body)
      .not
      .toContain('Venue checked');
  });

  test('renders the localized de-CH occupancy count in the legend', async () => {
    const player = aPlayer();
    const session = aSession({
      status: 'Voting',
      venues: [
        {
          venueNumber: 1,
          name: 'Turnhalle orange',
          shortName: 'Turnhalle orange',
          address: 'Dennigkofenweg 169',
          postalCode: '3072',
          city: 'Ostermundigen',
        },
      ],
      players: [player],
      proposedDates: [
        aProposedDate({id: 'date-1', votable: true, venueOccupancy: {count: 2, matches: []}}),
        aProposedDate({id: 'date-2', votable: true, venueOccupancy: {count: 0, matches: []}}),
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
      .toContain('2 weitere Spiele');
    expect(body)
      .not
      .toContain('Halle geprüft, keine weiteren Spiele');
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
