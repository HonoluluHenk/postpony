import { describe, expect, it } from 'vitest';
import { getTranslation } from '../../../locales';
import {
  ProposedDatesSection,
  ProposedDatesSectionPartial,
  type ProposedDatesSectionProps,
} from './proposed-dates-section';

const t = (key: any, params?: any): string => getTranslation('en-US', key, params);

function baseProps(): ProposedDatesSectionProps {
  return {
    sessionId: 'session-1',
    status: 'Voting',
    reopenCount: 0,
    proposedDates: [
      {id: 'pd-1', display: '10.10.2026 19:00', votable: true, yes: 0, maybe: 0, no: 0},
      {id: 'pd-2', display: '12.10.2026 20:00', votable: false, yes: 0, maybe: 0, no: 0},
    ],
    homeProposedDates: [
      {id: 'pd-1', display: '10.10.2026 19:00', yes: 1, maybe: 0, no: 0},
    ],
    awayProposedDates: [],
    organizerPlayers: [],
    ownTeamResults: [],
    clashCheckable: false,
    venues: [],
    t,
    locale: 'en-US',
    inputFormat: 'MM/dd/yyyy hh:mm aa',
  };
}

function renderToString(node: unknown): string {
  if (node === null || node === undefined) {
    return '';
  }
  return (node as {
    toString(): string
  }).toString();
}

describe('ProposedDatesSection component', () => {
  it('hides the add-date form and list when the status is Confirmed and offers reopen', () => {
    const html = renderToString(ProposedDatesSection({...baseProps(), status: 'Confirmed'}));

    expect(html)
      .toContain('hx-post="/edit/session-1/reopen"');
    expect(html)
      .toContain('>Reopen</button>');
    expect(html)
      .not
      .toContain('id="proposed-date-list"');
    expect(html)
      .not
      .toContain('id="proposedDateTime"');
    expect(html)
      .not
      .toContain('hx-post="/edit/session-1/proposed-dates"');
  });

  it('shows the add-date form when the status is open', () => {
    const html = renderToString(ProposedDatesSection(baseProps()));

    expect(html)
      .not
      .toContain('hx-post="/edit/session-1/reopen"');
    expect(html)
      .toContain('id="proposed-date-list"');
    expect(html)
      .toContain('hx-post="/edit/session-1/proposed-dates"');
    expect(html)
      .toContain('id="proposedDateTime"');
  });

  it('renders the reopen-count chip once the reopen count is non-zero', () => {
    const html = renderToString(ProposedDatesSection({...baseProps(), reopenCount: 2}));

    expect(html)
      .toContain('Reopened 2 time(s)');
  });

  it('checks the votable toggle only for dates that are votable', () => {
    const html = renderToString(ProposedDatesSection(baseProps()));

    expect(html)
      .toContain('checked=""');
    expect(html)
      .toContain('hx-post="/edit/session-1/proposed-date-visibility?proposedDateId=pd-1&amp;votable=false"');
    expect(html)
      .toContain('hx-post="/edit/session-1/proposed-date-visibility?proposedDateId=pd-2&amp;votable=true"');
  });

  it('renders the proposed dates as a grid of cards', () => {
    const html = renderToString(ProposedDatesSection(baseProps()));

    // The list is a flex column of proposed-date cards, each with a header
    // (date/venue + actions) and a details row (clash/occupancy info).
    expect(html)
      .toContain('class="proposed-date-list" id="proposed-date-list"');
    expect(html)
      .toContain('class="proposed-date-card');
    expect(html)
      .toContain('class="proposed-date-header"');
    expect(html)
      .toContain('class="proposed-date-info"');
    expect(html)
      .toContain('class="proposed-date-actions"');
    expect(html)
      .toContain('class="proposed-date-details"');
    expect(html)
      .not
      .toContain('<table');
  });

  it('keeps the votable switch and delete button label-less but a11y-named', () => {
    const html = renderToString(ProposedDatesSection(baseProps()));

    // The switch span is empty (icon-only) and the delete button has no text.
    expect((html.match(/<span><\/span>/g) ?? []))
      .toHaveLength(2);
    expect(html)
      .not
      .toContain('>Votable</span>');
    expect(html)
      .not
      .toContain('<i aria-hidden="true">delete</i>\n                      Delete');
    // The accessible name and the hover tooltip carry the full labels.
    expect((html.match(/aria-label="Allow voting"/g) ?? []))
      .toHaveLength(2);
    expect((html.match(/title="Allow voting"/g) ?? []))
      .toHaveLength(2);
    expect((html.match(/aria-label="Delete"/g) ?? []))
      .toHaveLength(2);
    expect((html.match(/title="Delete"/g) ?? []))
      .toHaveLength(2);
  });

  it('offers a confirm control only for votable dates', () => {
    const html = renderToString(ProposedDatesSection(baseProps()));

    expect(html)
      .toContain('proposed-date-confirm?proposedDateId=pd-1');
    expect(html)
      .not
      .toContain('proposed-date-confirm?proposedDateId=pd-2');
  });

  it('collapses the proposed-date list when there are no dates', () => {
    const html = renderToString(ProposedDatesSection({...baseProps(), proposedDates: []}));

    expect(html)
      .not
      .toContain('id="proposed-date-list"');
    expect(html)
      .toContain('hx-post="/edit/session-1/proposed-dates"');
  });

  it('marks the date input invalid and keeps the raw value when an error is present', () => {
    const html = renderToString(ProposedDatesSection({
      ...baseProps(),
      proposedDateTime: 'not-a-date',
      error: 'Invalid date',
    }));

    expect(html)
      .toContain('class="field label border fill max invalid"');
    expect(html)
      .toContain('value="not-a-date"');
    expect(html)
      .toContain('aria-invalid="true"');
    expect(html)
      .toContain('aria-describedby="proposedDateTime-error"');
    expect(html)
      .toContain('id="proposedDateTime-error"');
    expect(html)
      .toContain('>Invalid date</span>');
    expect(html)
      .not
      .toContain(' required=""');
  });

  it('renders the venue select with the fixed 1–10 options when no venues are known', () => {
    const html = renderToString(ProposedDatesSection(baseProps()));

    expect(html)
      .toContain('<select id="venueNumber" name="venueNumber">');
    expect(html)
      .toContain('>Venue</label>');
    for (let n = 1; n <= 10; n++) {
      expect(html)
        .toContain(`<option value="${n}">${n}</option>`);
    }
  });

  it('renders venue names next to their numbers when venues are known', () => {
    const html = renderToString(ProposedDatesSection({
      ...baseProps(),
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
    }));

    expect(html)
      .toContain('<option value="1">(1) - Turnhalle orange</option>');
    expect(html)
      .toContain('<option value="2">(2) - Turnhalle grün</option>');
    expect(html)
      .not
      .toContain('<option value="3">3</option>');
    expect(html)
      .toContain('>Venue</label>');
  });

  it('hides the venue select alongside the single-add form when Confirmed', () => {
    const html = renderToString(ProposedDatesSection({...baseProps(), status: 'Confirmed'}));

    expect(html)
      .not
      .toContain('id="venueNumber"');
  });

  it('defaults dates without a venue number to the (1) badge (legacy dates)', () => {
    const html = renderToString(ProposedDatesSection(baseProps()));

    expect(html)
      .toContain('>(1)</span>');
    expect((html.match(/>\(1\)<\/span>/g) ?? []))
      .toHaveLength(2);
  });

  it('renders the venue number badge next to each date', () => {
    const html = renderToString(ProposedDatesSection({
      ...baseProps(),
      proposedDates: [
        {id: 'pd-1', display: '10.10.2026 19:00', votable: true, yes: 0, maybe: 0, no: 0, venueNumber: 1},
        {id: 'pd-2', display: '12.10.2026 20:00', votable: false, yes: 0, maybe: 0, no: 0, venueNumber: 2},
      ],
    }));

    expect(html)
      .toContain('>(1)</span>');
    expect(html)
      .toContain('>(2)</span>');
  });

  it('shows the venue name and number in the badge tooltip when venues are known', () => {
    const html = renderToString(ProposedDatesSection({
      ...baseProps(),
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
      proposedDates: [
        {id: 'pd-1', display: '10.10.2026 19:00', votable: true, yes: 0, maybe: 0, no: 0, venueNumber: 2},
      ],
    }));

    expect(html)
      .toContain('title="2 – Turnhalle grün"');
    expect(html)
      .toContain('>(2)</span>');
  });

  it('falls back to just the number in the badge tooltip when the venue is unknown', () => {
    const html = renderToString(ProposedDatesSection({
      ...baseProps(),
      proposedDates: [
        {id: 'pd-1', display: '10.10.2026 19:00', votable: true, yes: 0, maybe: 0, no: 0, venueNumber: 3},
      ],
    }));

    expect(html)
      .toContain('title="3"');
    expect(html)
      .toContain('>(3)</span>');
  });
});

describe('ProposedDatesSection clash info', () => {
  it('renders one line per affected team with the localized time and opponent', () => {
    const html = renderToString(ProposedDatesSection({
      ...baseProps(),
      clashCheckable: true,
      proposedDates: [
        {
          id: 'pd-1',
          display: '10.10.2026 19:00',
          votable: true,
          yes: 0,
          maybe: 0,
          no: 0,
          clashes: {
            home: [{opponent: 'Thun', start: '2026-10-10T17:00'}],
            away: [{opponent: 'Burgdorf', start: '2026-10-10T21:30'}],
          },
        },
      ],
    }));

    expect(html)
      .toContain('Home: 5:00 PM vs Thun');
    expect(html)
      .toContain('Away: 9:30 PM vs Burgdorf');
  });

  it('renders the 24-hour localized time for de-CH', () => {
    const tDe = (key: any, params?: any): string => getTranslation('de-CH', key, params);
    const html = renderToString(ProposedDatesSection({
      ...baseProps(),
      t: tDe,
      locale: 'de-CH' as const,
      clashCheckable: true,
      proposedDates: [
        {
          id: 'pd-1',
          display: '10.10.2026 19:00',
          votable: true,
          yes: 0,
          maybe: 0,
          no: 0,
          clashes: {home: [{opponent: 'Thun', start: '2026-10-10T17:00'}], away: []},
        },
      ],
    }));

    expect(html)
      .toContain('Heim: 17:00 gegen Thun');
  });

  it('renders "checked, no clashes" when a check ran clean', () => {
    const html = renderToString(ProposedDatesSection({
      ...baseProps(),
      clashCheckable: true,
      proposedDates: [
        {
          id: 'pd-1',
          display: '10.10.2026 19:00',
          votable: true,
          yes: 0,
          maybe: 0,
          no: 0,
          clashes: {home: [], away: []},
        },
      ],
    }));

    expect(html)
      .toContain('Schedule checked, no clashes');
  });

  it('renders "not checked" for a hand-entered match without team identities', () => {
    const html = renderToString(ProposedDatesSection(baseProps()));

    expect(html)
      .toContain('Not checked');
  });

  it('renders nothing when the check failed (identities exist, no clash data)', () => {
    const html = renderToString(ProposedDatesSection({
      ...baseProps(),
      clashCheckable: true,
    }));

    expect(html)
      .not
      .toContain('Not checked');
    expect(html)
      .not
      .toContain('Schedule checked, no clashes');
    expect(html)
      .not
      .toContain('vs ');
  });

  it('offers the refresh action only for clash-checkable postponements', () => {
    const html = renderToString(ProposedDatesSection(baseProps()));

    expect(html)
      .not
      .toContain('refresh-clashes');
    expect(html)
      .not
      .toContain('Refresh schedule check');
  });

  it('offers the refresh action for a clash-checkable postponement', () => {
    const html = renderToString(ProposedDatesSection({...baseProps(), clashCheckable: true}));

    expect(html)
      .toContain('hx-post="/edit/session-1/refresh-clashes"');
    expect(html)
      .toContain('hx-target="#proposed-dates-management"');
    expect(html)
      .toContain('>Refresh schedule check</button>');
    expect(html)
      .not
      .toContain('showing the previous results');
  });

  it('hides the refresh action for a clash-checkable postponement with no proposed dates', () => {
    const html = renderToString(ProposedDatesSection({...baseProps(), clashCheckable: true, proposedDates: []}));

    expect(html)
      .not
      .toContain('refresh-clashes');
    expect(html)
      .not
      .toContain('Refresh schedule check');
  });

  it('renders the refresh failure notice when a refresh failed', () => {
    const html = renderToString(ProposedDatesSection({
      ...baseProps(),
      clashCheckable: true,
      refreshError: true,
    }));

    expect(html)
      .toContain('Couldn&#39;t refresh the schedule check — showing the previous results.');
  });

  it('hides the refresh action when the session is Confirmed', () => {
    const html = renderToString(ProposedDatesSection({
      ...baseProps(),
      status: 'Confirmed',
      clashCheckable: true,
    }));

    expect(html)
      .not
      .toContain('refresh-clashes');
  });

  it('renders the confirm clash warning with the persistent high-visibility notice when the flag is set', () => {
    const html = renderToString(ProposedDatesSection({
      ...baseProps(),
      status: 'Confirmed',
      confirmClashWarning: true,
    }));

    expect(html)
      .toContain('A scheduled game clashes with this date.');
    expect(html)
      .toContain('class="confirm-clash-warning mt-2"');
    expect(html)
      .toContain('role="alert"');
  });

  it('renders no confirm clash warning by default', () => {
    const html = renderToString(ProposedDatesSection({...baseProps(), status: 'Confirmed'}));

    expect(html)
      .not
      .toContain('A scheduled game clashes with this date.');
  });
});

describe('ProposedDatesSection venue occupancy info', () => {
  it('renders the count line when other home matches occupy the date\'s venue', () => {
    const html = renderToString(ProposedDatesSection({
      ...baseProps(),
      proposedDates: [
        {
          id: 'pd-1',
          display: '10.10.2026 19:00',
          votable: true,
          yes: 0,
          maybe: 0,
          no: 0,
          venueOccupancy: {
            count: 3,
            matches: [
              {opponent: 'Port', start: '2026-10-10T20:15'},
              {opponent: 'Bern', start: '2026-10-10T19:30'},
            ],
          },
        },
      ],
    }));

    expect(html)
      .toContain('3 other games at this venue');
  });

  it('renders the conflicting matches in an accessible tooltip popup', () => {
    const html = renderToString(ProposedDatesSection({
      ...baseProps(),
      proposedDates: [
        {
          id: 'pd-1',
          display: '10.10.2026 19:00',
          votable: true,
          yes: 0,
          maybe: 0,
          no: 0,
          venueOccupancy: {
            count: 2,
            matches: [
              {opponent: 'Port', start: '2026-10-10T20:15'},
              {opponent: 'Bern', start: '2026-10-10T19:30'},
            ],
          },
        },
      ],
    }));

    expect(html)
      .toContain('role="tooltip"');
    expect(html)
      .toContain('aria-describedby="occupancy-tooltip-pd-1"');
    expect(html)
      .toContain('id="occupancy-tooltip-pd-1"');
    expect(html)
      .toContain('Conflicting games at this venue');
    expect(html)
      .toContain('8:15 PM vs Port');
    expect(html)
      .toContain('7:30 PM vs Bern');
  });

  it('renders the clean line for a zero-count occupancy', () => {
    const html = renderToString(ProposedDatesSection({
      ...baseProps(),
      proposedDates: [
        {
          id: 'pd-1',
          display: '10.10.2026 19:00',
          votable: true,
          yes: 0,
          maybe: 0,
          no: 0,
          venueOccupancy: {count: 0, matches: []},
        },
      ],
    }));

    expect(html)
      .toContain('Venue checked, no other games');
    expect(html)
      .not
      .toContain('other games at this venue');
  });

  it('renders nothing when occupancy is absent (hand-entered match or failed scrape)', () => {
    const html = renderToString(ProposedDatesSection(baseProps()));

    expect(html)
      .not
      .toContain('other games at this venue');
    expect(html)
      .not
      .toContain('Venue checked');
  });

  it('renders the localized de-CH occupancy lines', () => {
    const tDe = (key: any, params?: any): string => getTranslation('de-CH', key, params);
    const html = renderToString(ProposedDatesSection({
      ...baseProps(),
      t: tDe,
      proposedDates: [
        {
          id: 'pd-1',
          display: '10.10.2026 19:00',
          votable: true,
          yes: 0,
          maybe: 0,
          no: 0,
          venueOccupancy: {count: 2, matches: []},
        },
        {
          id: 'pd-2',
          display: '12.10.2026 20:00',
          votable: true,
          yes: 0,
          maybe: 0,
          no: 0,
          venueOccupancy: {count: 0, matches: []},
        },
      ],
    }));

    expect(html)
      .toContain('2 weitere Spiele an dieser Halle');
    expect(html)
      .toContain('Halle geprüft, keine weiteren Spiele');
  });
});

describe('ProposedDatesSection generator block', () => {
  it('renders the generator block above the single-add form on initial render', () => {
    const html = renderToString(ProposedDatesSection(baseProps()));

    const generatorIndex = html.indexOf('Generate Proposed Dates');
    const singleAddIndex = html.indexOf('id="proposedDateTime"');
    expect(generatorIndex)
      .toBeGreaterThan(-1);
    expect(singleAddIndex)
      .toBeGreaterThan(-1);
    expect(generatorIndex)
      .toBeLessThan(singleAddIndex);
  });

  it('renders exactly seven fixed rows, one empty time input per weekday, Monday to Sunday', () => {
    const html = renderToString(ProposedDatesSection(baseProps()));

    expect((html.match(/name="time\[\]"/g) ?? []))
      .toHaveLength(7);
    expect(html.match(/name="weekday\[\]"/g))
      .toBeNull();
    const weekdayLabels = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
    weekdayLabels.forEach((label, index) => {
      expect(html)
        .toContain(`<label for="time-${index}">${label}</label>`);
    });
  });

  it('ships no add/remove row controls', () => {
    const html = renderToString(ProposedDatesSection({...baseProps(), times: ['', '', '', '', '', '', '']}));

    expect(html)
      .not
      .toContain('name="action"');
    expect(html)
      .not
      .toContain('value="grow"');
    expect(html)
      .not
      .toContain('value="remove"');
    expect(html)
      .not
      .toContain('formaction');
  });

  it('starts every time input empty on initial render', () => {
    const html = renderToString(ProposedDatesSection(baseProps()));

    const timeInputs = (html.match(/<input[^>]*name="time\[\]"[^>]*>/g) ?? []);
    expect(timeInputs)
      .toHaveLength(7);
    for (const tag of timeInputs) {
      expect(tag)
        .not
        .toContain('value=');
    }
  });

  it('round-trips submitted times through each row on re-render', () => {
    const html = renderToString(ProposedDatesSection({...baseProps(), times: ['8:00 pm', '', '9:00 pm']}));

    expect(html)
      .toContain('value="8:00 pm"');
    expect(html)
      .toContain('value="9:00 pm"');
  });

  it('uses the 24-hour HH:mm placeholder and de-CH lang per row for de-CH', () => {
    const props = {...baseProps(), locale: 'de-CH' as const, inputFormat: 'dd.MM.yyyy HH:mm'};
    const html = renderToString(ProposedDatesSection(props));

    expect((html.match(/placeholder="HH:mm"/g) ?? []))
      .toHaveLength(7);
    // ponytail: scope the lang check to the generator's time inputs so the
    // single-add field's `lang` (also de-CH) doesn't inflate the count.
    expect((html.match(/<input[^>]*name="time\[\]"[^>]*lang="de-CH"/g) ?? []))
      .toHaveLength(7);
    // ponytail: time input takes the locale's timeFormat only (HH:mm / hh:mm aa) —
    // not the full datetime placeholder, so the user knows they enter a time.
    expect(html.match(/<input[^>]*name="time\[\]"[^>]*placeholder="dd\.MM\.yyyy[^"]*"/g))
      .toBeNull();
  });

  it('uses the hh:mm aa placeholder and en-US lang per row for en-US', () => {
    const html = renderToString(ProposedDatesSection({...baseProps(), locale: 'en-US' as const}));

    expect((html.match(/placeholder="hh:mm aa"/g) ?? []))
      .toHaveLength(7);
    expect((html.match(/<input[^>]*name="time\[\]"[^>]*lang="en-US"/g) ?? []))
      .toHaveLength(7);
    expect(html.match(/<input[^>]*name="time\[\]"[^>]*placeholder="MM\/dd\/yyyy[^"]*"/g))
      .toBeNull();
  });

  it('labels each row with the locale weekday and the time field label', () => {
    const tDe = (key: any, params?: any): string => getTranslation('de-CH', key, params);
    const html = renderToString(ProposedDatesSection({...baseProps(), t: tDe, locale: 'de-CH' as const}));

    const weekdayLabels = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
    weekdayLabels.forEach((label, index) => {
      expect(html)
        .toContain(`<label for="time-${index}">${label}</label>`);
    });
    expect((html.match(/<label for="time-\d+">Uhrzeit<\/label>/g) ?? []))
      .toHaveLength(7);
  });

  it('marks the offending row invalid with an inline error and preserves the other rows', () => {
    const html = renderToString(ProposedDatesSection({
      ...baseProps(),
      times: ['8:00 pm', 'not-a-time', '9:00 pm'],
      generatorInvalidRow: 1,
    }));

    expect(html)
      .toMatch(/id="time-1"[^>]*aria-invalid="true"/);
    expect(html)
      .toMatch(/id="time-1"[^>]*aria-describedby="time-1-error"/);
    expect(html)
      .toContain('id="time-1-error"');
    expect(html)
      .toContain('>Please provide a valid date and time</span>');
    expect(html)
      .toContain('value="8:00 pm"');
    expect(html)
      .toContain('value="9:00 pm"');
    expect(html)
      .not
      .toMatch(/id="time-0"[^>]*aria-invalid/);
    expect(html)
      .not
      .toMatch(/id="time-2"[^>]*aria-invalid/);
  });

  it('hides the generator block alongside the single-add form when Confirmed', () => {
    const html = renderToString(ProposedDatesSection({...baseProps(), status: 'Confirmed'}));

    expect(html)
      .not
      .toContain('Generate Proposed Dates');
    expect(html)
      .not
      .toContain('name="time[]"');
    expect(html)
      .not
      .toContain('name="generate" value="tuple"');
    expect(html)
      .not
      .toContain('id="proposedDateTime"');
  });

  it('renders the success toast with the localized count when n >= 1', () => {
    const html = renderToString(ProposedDatesSection({...baseProps(), generatorSuccessCount: 12}));

    expect(html)
      .toContain('class="toast success top mt-2"');
    expect(html)
      .toContain('12 dates added');
  });

  it('renders the inline zero-result message from the generatorError prop', () => {
    const html = renderToString(ProposedDatesSection({
      ...baseProps(),
      generatorError: 'No dates were added. Adjust the patterns and try again.',
    }));

    expect(html)
      .toContain('class="error mt-2" role="alert"');
    expect(html)
      .toContain('No dates were added.');
  });

  it('renders a venue select inside the generator form reusing the single-add options', () => {
    const html = renderToString(ProposedDatesSection(baseProps()));

    // both the generator and the single-add form carry a venue select; the
    // generator one uses a distinct id so the two selects never collide.
    expect(html)
      .toContain('<select id="generateVenueNumber" name="venueNumber">');
    expect(html)
      .toContain('for="generateVenueNumber">Venue</label>');
    expect((html.match(/name="venueNumber"/g) ?? []))
      .toHaveLength(2);
    for (let n = 1; n <= 10; n++) {
      expect(html)
        .toContain(`<option value="${n}">${n}</option>`);
    }
  });

  it('renders venue names in the generator select when venues are known', () => {
    const html = renderToString(ProposedDatesSection({
      ...baseProps(),
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
    }));

    expect(html)
      .toContain('<option value="1">(1) - Turnhalle orange</option>');
    expect(html)
      .toContain('<option value="2">(2) - Turnhalle grün</option>');
    expect(html)
      .not
      .toContain('<option value="3">3</option>');
    expect(html)
      .toContain('for="generateVenueNumber">Venue</label>');
  });

  it('hides the generator venue select alongside the single-add form when Confirmed', () => {
    const html = renderToString(ProposedDatesSection({...baseProps(), status: 'Confirmed'}));

    expect(html)
      .not
      .toContain('id="generateVenueNumber"');
  });

  it('renders the no-anchor fallback warning as an inline message', () => {
    const html = renderToString(ProposedDatesSection({
      ...baseProps(),
      generatorError: 'No match anchor — using today as window start.',
    }));

    expect(html)
      .toContain('No match anchor — using today as window start.');
  });

  it('renders From and To as text fields with the locale date-token placeholder and lang', () => {
    const html = renderToString(ProposedDatesSection(baseProps()));

    // From and To are plain text inputs, not native ISO date controls.
    expect(html)
      .toContain('id="fromDate" type="text"');
    expect(html)
      .toContain('id="toDate" type="text"');
    expect(html)
      .not
      .toContain('id="fromDate" type="date"');
    expect(html)
      .not
      .toContain('id="toDate" type="date"');
    // The placeholder shows the locale's date token format (MM/dd/yyyy for en-US).
    expect(html)
      .toMatch(/id="fromDate" type="text" name="fromDate"[^>]*placeholder="MM\/dd\/yyyy"/);
    expect(html)
      .toMatch(/id="toDate" type="text" name="toDate"[^>]*placeholder="MM\/dd\/yyyy"/);
    // Both carry the locale's lang and autocomplete off.
    expect(html)
      .toMatch(/id="fromDate"[^>]*lang="en-US"[^>]*autocomplete="off"/);
    expect(html)
      .toMatch(/id="toDate"[^>]*lang="en-US"[^>]*autocomplete="off"/);
  });

  it('renders the dd.MM.yyyy token placeholder for de-CH From/To fields', () => {
    const tDe = (key: any, params?: any): string => getTranslation('de-CH', key, params);
    const html = renderToString(ProposedDatesSection({
      ...baseProps(),
      t: tDe,
      locale: 'de-CH' as const,
      inputFormat: 'dd.MM.yyyy HH:mm',
    }));

    expect(html)
      .toMatch(/id="fromDate"[^>]*placeholder="dd\.MM\.yyyy"/);
    expect(html)
      .toMatch(/id="toDate"[^>]*placeholder="dd\.MM\.yyyy"/);
    expect(html)
      .toMatch(/id="fromDate"[^>]*lang="de-CH"/);
    expect(html)
      .toMatch(/id="toDate"[^>]*lang="de-CH"/);
  });

  it('gives each From/To field its own calendar button with a distinct accessible name', () => {
    const html = renderToString(ProposedDatesSection(baseProps()));

    expect(html)
      .toContain('id="fromDate-picker"');
    expect(html)
      .toContain('id="toDate-picker"');
    expect(html)
      .toContain('aria-label="Open calendar for the From date"');
    expect(html)
      .toContain('aria-label="Open calendar for the To date"');
    // The datetime field keeps its existing single label.
    expect(html)
      .toContain('aria-label="Open calendar"');
  });

  it('round-trips locale-token From/To values on re-render', () => {
    const html = renderToString(ProposedDatesSection({
      ...baseProps(),
      fromDate: '08/26/2026',
      toDate: '09/23/2026',
    }));

    expect(html)
      .toMatch(/id="fromDate"[^>]*value="08\/26\/2026"/);
    expect(html)
      .toMatch(/id="toDate"[^>]*value="09\/23\/2026"/);
  });

  it('marks From/To invalid with the shared required message and keeps raw values', () => {
    const html = renderToString(ProposedDatesSection({
      ...baseProps(),
      generatorFromError: 'Please enter a date',
      generatorToError: 'Please enter a date',
      fromDate: 'bad-token',
      toDate: 'also-bad',
    }));

    expect(html)
      .toMatch(/id="fromDate"[^>]*aria-invalid="true"/);
    expect(html)
      .toMatch(/id="fromDate"[^>]*aria-describedby="fromDate-error"/);
    expect(html)
      .toContain('id="fromDate-error"');
    expect(html)
      .toMatch(/id="toDate"[^>]*aria-invalid="true"/);
    expect(html)
      .toMatch(/id="toDate"[^>]*aria-describedby="toDate-error"/);
    expect(html)
      .toContain('id="toDate-error"');
    expect(html)
      .toMatch(/id="fromDate"[^>]*value="bad-token"/);
    expect(html)
      .toMatch(/id="toDate"[^>]*value="also-bad"/);
  });
});

describe('ProposedDatesSectionPartial', () => {
  it('renders the section with its out-of-band companions and no document preamble', () => {
    const html = renderToString(ProposedDatesSectionPartial({
      ...baseProps(),
      ownTeamResults: [
        {
          dateId: 'pd-1',
          display: '10.10.2026 19:00',
          votes: [{playerId: 'p1', playerName: 'Voter', vote: 'Yes'}],
          voted: 1,
          total: 1,
          nonVoters: [],
        },
      ],
    }));

    expect(html)
      .toContain('id="error-container" hx-swap-oob="true"');
    expect(html)
      .toContain('<p class="chip outline" id="status-chip" hx-swap-oob="true">');
    expect(html)
      .toContain('id="proposed-dates-management"');
    expect(html)
      .toContain('id="vote-tally-section" hx-swap-oob="true"');
    expect(html)
      .toContain('<section id="own-team-votes" class="padding small-round surface-variant" hx-swap-oob="true"');
    expect(html)
      .not
      .toContain('<!DOCTYPE html>');
    expect(html)
      .not
      .toContain('<html');
  });

  it('surfaces the global error inside the out-of-band error container', () => {
    const html = renderToString(ProposedDatesSectionPartial({
      ...baseProps(),
      globalError: 'Something went wrong',
    }));

    expect(html)
      .toContain('error padding white-text');
    expect(html)
      .toContain('Something went wrong');
  });
});
