import { describe, expect, it } from 'vitest';
import merge from 'lodash-es/merge';
import { aPlayer, aProposedDate, aSession, aVote } from '../../../lib/__test-utils__/builders';
import type { Postponement } from '../../../lib/models';
import { getTranslation, inputFormat, type TranslationKeys } from '../../../locales';
import { GenerateForm, ProposedDatesRail, type EditGridProps } from './proposed-dates-section';
import { buildEditPartialsData } from './render-edit-partials';

const t = (key: TranslationKeys, params?: Record<string, string>): string =>
  getTranslation('en-US', key, params);

const BASE_URL = 'https://game-scheduler.localhost:3000';

const identities = {
  home: {championship: 'MTTV 26/27', group: '219397', teamtable: '1732195'},
  away: {championship: 'MTTV 26/27', group: '219397', teamtable: '1732193'},
};

function buildSession(overrides: Parameters<typeof aSession>[0] = {}): Postponement {
  return aSession(merge({
    homeTeam: 'Home Team',
    guestTeam: 'Guest Team',
    status: 'Voting',
    homeTeamIdentity: identities.home,
    guestTeamIdentity: identities.away,
    players: [
      aPlayer({id: 'p1', name: 'Alice', teamId: 'home'}),
      aPlayer({id: 'p2', name: 'Bob', teamId: 'home'}),
      aPlayer({id: 'p3', name: 'Carol', teamId: 'away'}),
    ],
    venues: [
      {venueNumber: 1, name: 'Turnhalle orange', shortName: 'Turnhalle orange', address: 'Dennigkofenweg 169', postalCode: '3072', city: 'Ostermundigen'},
    ],
    proposedDates: [
      aProposedDate({
        id: 'pd-1',
        dateTimeRange: {start: '2026-09-01T20:00', end: '2026-09-01T22:00'},
        votable: true,
        venueNumber: 1,
      }),
    ],
    votes: [
      aVote({id: 'v1', proposedDateId: 'pd-1', participantId: 'p1', type: 'Yes'}),
      aVote({id: 'v2', proposedDateId: 'pd-1', participantId: 'p2', type: 'No'}),
    ],
  }, overrides));
}

function railProps(session: Postponement, overrides: Partial<EditGridProps> = {}): EditGridProps {
  return {
    sessionId: session.id,
    status: session.status,
    reopenCount: session.reopenCount,
    t,
    locale: 'en-US',
    inputFormat: inputFormat('en-US'),
    baseUrl: BASE_URL,
    organizerTeam: 'home',
    ...buildEditPartialsData(session, 'en-US'),
    ...overrides,
  };
}

function renderToString(node: unknown): string {
  if (node === null || node === undefined) {
    return '';
  }
  return (node as { toString(): string }).toString();
}

describe('ProposedDatesRail week grouping', () => {
  it('groups dates into week headings carrying the ISO week label and date range', () => {
    const session = buildSession({
      proposedDates: [
        aProposedDate({id: 'pd-a', dateTimeRange: {start: '2026-09-01T20:00', end: '2026-09-01T22:00'}, votable: true, venueNumber: 1}),
        aProposedDate({id: 'pd-b', dateTimeRange: {start: '2026-09-02T20:00', end: '2026-09-02T22:00'}, votable: true, venueNumber: 1}),
        aProposedDate({id: 'pd-c', dateTimeRange: {start: '2026-09-08T20:00', end: '2026-09-08T22:00'}, votable: true, venueNumber: 1}),
      ],
    });
    const html = renderToString(ProposedDatesRail(railProps(session)));

    expect(html)
      .toContain('<h3 class="week-head">');
    expect(html)
      .toContain('<span class="week-range">Aug 31 – Sep 6</span>');
    expect(html)
      .toContain('Week 36');
    expect(html)
      .toContain('Week 37');
    expect(html)
      .toContain('class="date-row"');
    expect(html)
      .toContain('class="date-cell"');
    expect(html)
      .toContain('September 1');
    expect(html)
      .toContain('8:00 PM');
  });
});

describe('ProposedDatesRail date chips', () => {
  it('renders a clash chip and marks the row as a clash row', () => {
    const session = buildSession({
      proposedDates: [
        aProposedDate({
          id: 'pd-clash',
          dateTimeRange: {start: '2026-09-01T20:00', end: '2026-09-01T22:00'},
          votable: true,
          venueNumber: 1,
          clashes: {home: [{opponent: 'Opponent', start: '2026-09-01T19:00'}], away: []},
        }),
      ],
    });
    const html = renderToString(ProposedDatesRail(railProps(session)));

    expect(html)
      .toContain('class="date-row clash-row"');
    expect(html)
      .toContain('role="group"');
    expect(html)
      .toContain('aria-label="Schedule clash: Tu, Sep 1, 2026, 8:00 PM"');
    expect(html)
      .toContain('<span class="chip chip--error">Home: 7:00 PM vs Opponent</span>');
    expect(html)
      .toContain('<span class="chip" title="(1) Turnhalle orange">(1) Turnhalle orange</span>');
  });

  it('renders the clean chip when the schedule check found no clashes', () => {
    const session = buildSession({
      proposedDates: [
        aProposedDate({
          id: 'pd-clean',
          dateTimeRange: {start: '2026-09-01T20:00', end: '2026-09-01T22:00'},
          votable: true,
          venueNumber: 1,
          clashes: {home: [], away: []},
        }),
      ],
    });
    const html = renderToString(ProposedDatesRail(railProps(session)));

    expect(html)
      .toContain('<span class="chip chip--clean">No other games</span>');
  });

  it('renders the not-checked chip when the schedule check cannot run', () => {
    const session = aSession({
      proposedDates: [
        aProposedDate({id: 'pd-unchecked', dateTimeRange: {start: '2026-09-01T20:00', end: '2026-09-01T22:00'}, votable: true, venueNumber: 1}),
      ],
    });
    const html = renderToString(ProposedDatesRail(railProps(session)));

    expect(html)
      .toContain('<span class="chip">Not checked</span>');
  });

  it('renders the venue-occupancy clean chip when the venue is free', () => {
    const session = buildSession({
      proposedDates: [
        aProposedDate({
          id: 'pd-occ-clean',
          dateTimeRange: {start: '2026-09-01T20:00', end: '2026-09-01T22:00'},
          votable: true,
          venueNumber: 1,
          venueOccupancy: {count: 0, matches: []},
        }),
      ],
    });
    const html = renderToString(ProposedDatesRail(railProps(session)));

    expect(html)
      .toContain('<span class="chip chip--clean">Venue empty</span>');
  });

  it('renders the venue-occupancy warn chip with the count when the venue is busy', () => {
    const session = buildSession({
      proposedDates: [
        aProposedDate({
          id: 'pd-occ-warn',
          dateTimeRange: {start: '2026-09-01T20:00', end: '2026-09-01T22:00'},
          votable: true,
          venueNumber: 1,
          venueOccupancy: {count: 2, matches: [{opponent: 'Köniz II', start: '2026-09-01T19:30'}]},
        }),
      ],
    });
    const html = renderToString(ProposedDatesRail(railProps(session)));

    expect(html)
      .toContain('<span class="chip chip--warn">2 other games at this venue</span>');
  });

  it('renders the single-game occupancy line for a count of one', () => {
    const session = buildSession({
      proposedDates: [
        aProposedDate({
          id: 'pd-occ-one',
          dateTimeRange: {start: '2026-09-01T20:00', end: '2026-09-01T22:00'},
          votable: true,
          venueNumber: 1,
          venueOccupancy: {count: 1, matches: [{opponent: 'Köniz II', start: '2026-09-01T19:30'}]},
        }),
      ],
    });
    const html = renderToString(ProposedDatesRail(railProps(session)));

    expect(html)
      .toContain('<span class="chip chip--warn">1 other game at this venue</span>');
  });
});

describe('ProposedDatesRail vote dots', () => {
  it('renders one dot per roster player with the vote class and the voted count', () => {
    const session = buildSession({
      players: [
        aPlayer({id: 'p1', name: 'Alice', teamId: 'home'}),
        aPlayer({id: 'p2', name: 'Bob', teamId: 'home'}),
        aPlayer({id: 'p4', name: 'Dave', teamId: 'home'}),
      ],
      proposedDates: [
        aProposedDate({id: 'pd-votes', dateTimeRange: {start: '2026-09-01T20:00', end: '2026-09-01T22:00'}, votable: true, venueNumber: 1}),
      ],
      votes: [
        aVote({id: 'v1', proposedDateId: 'pd-votes', participantId: 'p1', type: 'Yes'}),
        aVote({id: 'v2', proposedDateId: 'pd-votes', participantId: 'p2', type: 'No'}),
      ],
    });
    const html = renderToString(ProposedDatesRail(railProps(session)));

    expect(html)
      .toContain('<span class="vote-dots-label">Your Team Votes</span>');
    expect(html)
      .toContain('<span class="vote-dot vote-dot--yes" title="Alice: Yes"></span>');
    expect(html)
      .toContain('<span class="vote-dot vote-dot--no" title="Bob: No"></span>');
    expect(html)
      .toContain('<span class="vote-dot vote-dot--none" title="Dave: no vote"></span>');
    expect(html)
      .toContain('>2/3 voted<');
  });

  it('classifies an IfNecessary vote with the ifnecessary dot class', () => {
    const session = buildSession({
      proposedDates: [
        aProposedDate({id: 'pd-ifnec', dateTimeRange: {start: '2026-09-01T20:00', end: '2026-09-01T22:00'}, votable: true, venueNumber: 1}),
      ],
      votes: [
        aVote({id: 'v1', proposedDateId: 'pd-ifnec', participantId: 'p1', type: 'IfNecessary'}),
      ],
    });
    const html = renderToString(ProposedDatesRail(railProps(session)));

    expect(html)
      .toContain('<span class="vote-dot vote-dot--ifnecessary" title="Alice: IfNecessary"></span>');
  });
});

describe('ProposedDatesRail date actions', () => {
  it('wires the votable toggle, confirm and delete actions to the edit grid', () => {
    const session = buildSession({
      proposedDates: [
        aProposedDate({id: 'pd-open', dateTimeRange: {start: '2026-09-01T20:00', end: '2026-09-01T22:00'}, votable: true, venueNumber: 1}),
        aProposedDate({id: 'pd-closed', dateTimeRange: {start: '2026-09-08T20:00', end: '2026-09-08T22:00'}, votable: false, venueNumber: 1}),
      ],
    });
    const html = renderToString(ProposedDatesRail(railProps(session)));

    expect(html)
      .toContain('hx-post="/edit/test-session/proposed-date-visibility?proposedDateId=pd-open&amp;votable=false"');
    expect(html)
      .toContain('hx-post="/edit/test-session/proposed-date-visibility?proposedDateId=pd-closed&amp;votable=true"');
    expect(html)
      .toContain('aria-label="Allow voting"');
    expect(html)
      .toContain('Votable: on');
    expect(html)
      .toContain('Votable: off');

    expect(html)
      .toContain('hx-post="/edit/test-session/proposed-date-confirm?proposedDateId=pd-open"');
    expect(html)
      .not
      .toContain('proposed-date-confirm?proposedDateId=pd-closed');

    expect(html)
      .toContain('data-open-dialog="delete-proposed-date-pd-open"');
    expect(html)
      .toContain('aria-label="Delete"');
    expect(html)
      .toContain('hx-post="/edit/test-session/proposed-date-delete?proposedDateId=pd-open"');
    expect(html)
      .toContain('>Delete</button>');
  });

  it('hides the confirm control and the add-date form when the status is Confirmed', () => {
    const session = buildSession({
      status: 'Confirmed',
      proposedDates: [
        aProposedDate({id: 'pd-1', dateTimeRange: {start: '2026-09-01T20:00', end: '2026-09-01T22:00'}, votable: true, venueNumber: 1}),
      ],
    });
    const html = renderToString(ProposedDatesRail(railProps(session)));

    expect(html)
      .not
      .toContain('proposed-date-confirm');
    expect(html)
      .not
      .toContain('id="proposedDateTime"');
  });
});

describe('ProposedDatesRail rail-level controls', () => {
  it('renders the export and refresh-clash controls when there are votable, checked dates', () => {
    const session = buildSession({
      proposedDates: [
        aProposedDate({id: 'pd-1', dateTimeRange: {start: '2026-09-01T20:00', end: '2026-09-01T22:00'}, votable: true, venueNumber: 1, clashes: {home: [], away: []}}),
      ],
    });
    const html = renderToString(ProposedDatesRail(railProps(session)));

    expect(html)
      .toContain(`href="${BASE_URL}/edit/test-session/calendar.ics"`);
    expect(html)
      .toContain('hx-post="/edit/test-session/refresh-clashes"');
  });

  it('shows the empty message when no dates have been proposed', () => {
    const session = aSession({
      homeTeam: 'Home Team',
      guestTeam: 'Guest Team',
      homeTeamIdentity: identities.home,
      guestTeamIdentity: identities.away,
      players: [
        aPlayer({id: 'p1', name: 'Alice', teamId: 'home'}),
      ],
    });
    const html = renderToString(ProposedDatesRail(railProps(session)));

    expect(html)
      .toContain('No dates have been proposed yet.');
  });

  it('announces a refresh failure and a confirm-clash warning when set', () => {
    const session = buildSession();
    const html = renderToString(ProposedDatesRail(railProps(session, {
      refreshError: true,
      confirmClashWarning: true,
    })));

    expect(html)
      .toContain("Couldn&#39;t refresh the schedule check — showing the previous results.");
    expect(html)
      .toContain('A scheduled game clashes with this date.');
  });

  it('renders the success toast after a date is added', () => {
    const session = buildSession();
    const html = renderToString(ProposedDatesRail(railProps(session, {success: true})));

    expect(html)
      .toContain('class="toast success top mt-2"');
    expect(html)
      .toContain('Proposed date added!');
  });
});

describe('ProposedDatesRail inline team tallies', () => {
  it('renders both teams inline tallies as available (yes/if/no) per date', () => {
    const session = buildSession({
      homeTeam: 'Ostermundigen',
      guestTeam: 'Thun',
      players: [
        aPlayer({id: 'h1', name: 'H One', teamId: 'home'}),
        aPlayer({id: 'h2', name: 'H Two', teamId: 'home'}),
        aPlayer({id: 'a1', name: 'A One', teamId: 'away'}),
      ],
      proposedDates: [
        aProposedDate({id: 'pd-t', dateTimeRange: {start: '2026-09-01T20:00', end: '2026-09-01T22:00'}, votable: true, venueNumber: 1}),
      ],
      votes: [
        aVote({id: 'v1', proposedDateId: 'pd-t', participantId: 'h1', type: 'Yes'}),
        aVote({id: 'v2', proposedDateId: 'pd-t', participantId: 'h2', type: 'IfNecessary'}),
        aVote({id: 'v3', proposedDateId: 'pd-t', participantId: 'a1', type: 'No'}),
      ],
    });
    const html = renderToString(ProposedDatesRail(railProps(session, {homeTeam: 'Ostermundigen', guestTeam: 'Thun'})));

    expect(html)
      .toContain('<div class="team-tallies">');
    // Home: two can play (yes + if-needed), one no. Away: one no.
    expect(html)
      .toContain('<span class="team-tally">Ostermundigen: 2 (1/1/0)</span>');
    expect(html)
      .toContain('<span class="team-tally">Thun: 0 (0/0/1)</span>');
  });

  it('falls back to a zero tally for a date neither team has voted on', () => {
    // pd-new has no matching votes (the fixture's votes reference another date).
    const session = buildSession({
      proposedDates: [
        aProposedDate({id: 'pd-new', dateTimeRange: {start: '2026-09-01T20:00', end: '2026-09-01T22:00'}, votable: true, venueNumber: 1}),
      ],
    });
    const html = renderToString(ProposedDatesRail(railProps(session, {homeTeam: 'Home Team', guestTeam: 'Guest Team'})));

    expect(html)
      .toContain('<span class="team-tally">Home Team: 0 (0/0/0)</span>');
    expect(html)
      .toContain('<span class="team-tally">Guest Team: 0 (0/0/0)</span>');
  });
});

describe('ProposedDatesRail restored vote tables', () => {
  it('renders the own-team, home and away tables in closed disclosures at the rail end', () => {
    const html = renderToString(ProposedDatesRail(railProps(buildSession())));

    expect(html)
      .toContain('<div class="edit-votes">');
    expect(html)
      .toContain('<details id="own-team-votes" class="votes-details">');
    expect(html)
      .toContain('<summary>Your Team Votes</summary>');
    expect(html)
      .toMatch(/<details>\s*<summary><h3 id="vote-summary-home-title">Home Team Votes<\/h3><\/summary>/);
    expect(html)
      .toMatch(/<details>\s*<summary><h3 id="vote-summary-away-title">Away Team Votes<\/h3><\/summary>/);
    // All three disclosures are closed by default: no `open` attribute on any.
    expect(html)
      .not
      .toContain('<details open');
  });
});

describe('ProposedDatesRail sort control', () => {
  const sortDates = [
    aProposedDate({id: 'pd-a', dateTimeRange: {start: '2026-09-01T20:00', end: '2026-09-01T22:00'}, votable: true, venueNumber: 1}),
    aProposedDate({id: 'pd-b', dateTimeRange: {start: '2026-09-08T20:00', end: '2026-09-08T22:00'}, votable: true, venueNumber: 1}),
    aProposedDate({id: 'pd-c', dateTimeRange: {start: '2026-09-15T20:00', end: '2026-09-15T22:00'}, votable: true, venueNumber: 1}),
    aProposedDate({id: 'pd-d', dateTimeRange: {start: '2026-09-22T20:00', end: '2026-09-22T22:00'}, votable: true, venueNumber: 1}),
  ];
  // Home availability: pd-a=1, pd-b=2, pd-c=2 (yes + if-needed), pd-d=0.
  const sortVotes = [
    aVote({id: 'v1', proposedDateId: 'pd-a', participantId: 'p1', type: 'Yes'}),
    aVote({id: 'v2', proposedDateId: 'pd-b', participantId: 'p1', type: 'Yes'}),
    aVote({id: 'v3', proposedDateId: 'pd-b', participantId: 'p2', type: 'Yes'}),
    aVote({id: 'v4', proposedDateId: 'pd-c', participantId: 'p1', type: 'Yes'}),
    aVote({id: 'v5', proposedDateId: 'pd-c', participantId: 'p2', type: 'IfNecessary'}),
  ];

  it('renders the radiogroup with Date and Availability options that get the edit grid', () => {
    const session = buildSession({proposedDates: sortDates, votes: sortVotes});
    const html = renderToString(ProposedDatesRail(railProps(session)));

    expect(html)
      .toContain('class="sort-control" role="radiogroup" aria-label="Sort by"');
    expect(html)
      .toContain('name="sort" value="date" checked');
    expect(html)
      .toContain('hx-get="/edit/test-session?sort=date"');
    expect(html)
      .toContain('name="sort" value="availability"');
    expect(html)
      .toContain('hx-get="/edit/test-session?sort=availability"');
    expect(html)
      .toContain('hx-target="#edit-grid"');
    expect(html)
      .toContain('hx-push-url="true"');
  });

  it('groups by availability and orders by date within a group when sorted by availability', () => {
    const session = buildSession({proposedDates: sortDates, votes: sortVotes});
    const html = renderToString(ProposedDatesRail(railProps(session, {sort: 'availability'})));

    expect(html)
      .toContain('<span>Available: 2</span>');
    expect(html)
      .toContain('<span>Available: 1</span>');
    expect(html)
      .toContain('<span>Available: 0</span>');
    // Availability grouping labels the groups by count, not ISO week.
    expect(html)
      .not
      .toContain('>Week ');

    // Within "Available: 2" Sep 8 precedes Sep 15; then the 1s and 0s groups.
    const sep8 = html.indexOf('>September 8<');
    const sep15 = html.indexOf('>September 15<');
    const sep1 = html.indexOf('>September 1<');
    const sep22 = html.indexOf('>September 22<');
    expect(sep8)
      .toBeGreaterThan(-1);
    expect(sep8)
      .toBeLessThan(sep15);
    expect(sep15)
      .toBeLessThan(sep1);
    expect(sep1)
      .toBeLessThan(sep22);
  });

  it('restores ISO-week grouping when sorted by date', () => {
    const session = buildSession({proposedDates: sortDates, votes: sortVotes});
    const html = renderToString(ProposedDatesRail(railProps(session, {sort: 'date'})));

    expect(html)
      .toContain('Week 36');
    expect(html)
      .toContain('Week 37');
    expect(html)
      .toContain('Week 38');
    expect(html)
      .toContain('Week 39');
    expect(html)
      .not
      .toContain('Available:');
  });

  it('drives the availability grouping from the away tallies when the organizer is away', () => {
    const session = buildSession({
      organizerTeam: 'away',
      proposedDates: sortDates,
      players: [
        aPlayer({id: 'p3', name: 'Carol', teamId: 'away'}),
        aPlayer({id: 'p4', name: 'Dave', teamId: 'away'}),
        aPlayer({id: 'p5', name: 'Erin', teamId: 'away'}),
      ],
      votes: [
        aVote({id: 'a1', proposedDateId: 'pd-c', participantId: 'p3', type: 'Yes'}),
        aVote({id: 'a2', proposedDateId: 'pd-c', participantId: 'p4', type: 'IfNecessary'}),
      ],
    });
    const html = renderToString(ProposedDatesRail(railProps(session, {sort: 'availability', organizerTeam: 'away'})));

    expect(html)
      .toContain('<span>Available: 2</span>');
    // Only pd-c has away availability, so it leads the list.
    expect(html.indexOf('>September 15<'))
      .toBeLessThan(html.indexOf('>September 1<'));
  });
});

describe('GenerateForm', () => {
  it('renders the Monday–Sunday weekday grid with the from/to/venue controls', () => {
    const html = renderToString(GenerateForm({
      sessionId: 'test-session',
      t,
      locale: 'en-US',
      venueOptions: [],
    }));

    expect(html)
      .toContain('hx-post="/edit/test-session/proposed-dates"');
    expect(html)
      .toContain('hx-target="#edit-grid"');
    expect(html)
      .toContain('id="fromDate"');
    expect(html)
      .toContain('id="toDate"');
    expect(html)
      .toContain('id="generateVenueNumber"');
    expect(html)
      .toContain('class="list no-margin generate-time-grid"');
    // ADR-0021: the generator grid is Monday–Sunday in the locale's order.
    for (const weekday of ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']) {
      expect(html)
        .toContain(`>${weekday}</label>`);
    }
    expect(html)
      .toContain('id="time-0"');
    expect(html)
      .toContain('id="time-6"');
  });

  it('marks the invalid row and shows a success toast with the added count', () => {
    const html = renderToString(GenerateForm({
      sessionId: 'test-session',
      t,
      locale: 'en-US',
      venueOptions: [],
      invalidRow: 2,
      successCount: 5,
      times: ['8:00 pm', '9:00 pm', 'bad', '10:00 pm'],
    }));

    expect(html)
      .toMatch(/id="time-2"[^>]*aria-invalid="true"/);
    expect(html)
      .toContain('id="time-2-error"');
    expect(html)
      .toContain('>Please provide a valid date and time</span>');
    expect(html)
      .toContain('>5 dates added<');
  });

  it('renders the from/to field errors and the generator error', () => {
    const html = renderToString(GenerateForm({
      sessionId: 'test-session',
      t,
      locale: 'en-US',
      venueOptions: [],
      fromError: 'Please enter a date',
      toError: 'Please enter a date',
      error: 'No dates were added. Fill in a time for the days you want to propose.',
    }));

    expect(html)
      .toMatch(/id="fromDate"[^>]*aria-invalid="true"/);
    expect(html)
      .toContain('id="fromDate-error"');
    expect(html)
      .toMatch(/id="toDate"[^>]*aria-invalid="true"/);
    expect(html)
      .toContain('id="toDate-error"');
    expect(html)
      .toContain('role="alert"');
  });
});
