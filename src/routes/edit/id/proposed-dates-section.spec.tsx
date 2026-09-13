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
