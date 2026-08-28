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
      { id: 'pd-1', display: '10.10.2026 19:00', votableByOpponent: true, yes: 0, maybe: 0, no: 0 },
      { id: 'pd-2', display: '12.10.2026 20:00', votableByOpponent: false, yes: 0, maybe: 0, no: 0 },
    ],
    homeProposedDates: [
      { id: 'pd-1', display: '10.10.2026 19:00', yes: 1, maybe: 0, no: 0 },
    ],
    awayProposedDates: [],
    organizerPlayers: [],
    ownTeamResults: [],
    t,
    locale: 'en-US',
    inputFormat: 'MM/dd/yyyy hh:mm aa',
  };
}

function renderToString(node: unknown): string {
  if (node === null || node === undefined) {
    return '';
  }
  return (node as { toString(): string }).toString();
}

describe('ProposedDatesSection component', () => {
  it('hides the add-date form and list when the status is Confirmed and offers reopen', () => {
    const html = renderToString(ProposedDatesSection({...baseProps(), status: 'Confirmed'}));

    expect(html).toContain('hx-post="/edit/session-1/reopen"');
    expect(html).toContain('>Reopen</button>');
    expect(html).not.toContain('id="proposed-date-list"');
    expect(html).not.toContain('id="proposedDateTime"');
    expect(html).not.toContain('hx-post="/edit/session-1/proposed-dates"');
  });

  it('shows the add-date form when the status is open', () => {
    const html = renderToString(ProposedDatesSection(baseProps()));

    expect(html).not.toContain('hx-post="/edit/session-1/reopen"');
    expect(html).toContain('id="proposed-date-list"');
    expect(html).toContain('hx-post="/edit/session-1/proposed-dates"');
    expect(html).toContain('id="proposedDateTime"');
  });

  it('renders the reopen-count chip once the reopen count is non-zero', () => {
    const html = renderToString(ProposedDatesSection({...baseProps(), reopenCount: 2}));

    expect(html).toContain('Reopened 2 time(s)');
  });

  it('checks the opponent-votable toggle only for dates that are votable', () => {
    const html = renderToString(ProposedDatesSection(baseProps()));

    expect(html).toContain('checked=""');
    expect(html).toContain('hx-post="/edit/session-1/proposed-date-visibility?proposedDateId=pd-1&amp;votable=false"');
    expect(html).toContain('hx-post="/edit/session-1/proposed-date-visibility?proposedDateId=pd-2&amp;votable=true"');
  });

  it('offers a confirm control only for opponent-votable dates', () => {
    const html = renderToString(ProposedDatesSection(baseProps()));

    expect(html).toContain('proposed-date-confirm?proposedDateId=pd-1');
    expect(html).not.toContain('proposed-date-confirm?proposedDateId=pd-2');
  });

  it('collapses the proposed-date list when there are no dates', () => {
    const html = renderToString(ProposedDatesSection({...baseProps(), proposedDates: []}));

    expect(html).not.toContain('id="proposed-date-list"');
    expect(html).toContain('hx-post="/edit/session-1/proposed-dates"');
  });

  it('marks the date input invalid and keeps the raw value when an error is present', () => {
    const html = renderToString(ProposedDatesSection({
      ...baseProps(),
      proposedDateTime: 'not-a-date',
      error: 'Invalid date',
    }));

    expect(html).toContain('class="field label border fill max invalid"');
    expect(html).toContain('value="not-a-date"');
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('aria-describedby="proposedDateTime-error"');
    expect(html).toContain('id="proposedDateTime-error"');
    expect(html).toContain('>Invalid date</span>');
    expect(html).not.toContain(' required=""');
  });
});

describe('ProposedDatesSection generator block', () => {
  it('renders the generator block above the single-add form on initial render', () => {
    const html = renderToString(ProposedDatesSection(baseProps()));

    const generatorIndex = html.indexOf('Generate Proposed Dates');
    const singleAddIndex = html.indexOf('id="proposedDateTime"');
    expect(generatorIndex).toBeGreaterThan(-1);
    expect(singleAddIndex).toBeGreaterThan(-1);
    expect(generatorIndex).toBeLessThan(singleAddIndex);
  });

  it('ships exactly one tuple row on initial render', () => {
    const html = renderToString(ProposedDatesSection(baseProps()));

    expect((html.match(/name="weekday\[\]"/g) ?? []).length).toBe(1);
    expect((html.match(/name="time\[\]"/g) ?? []).length).toBe(1);
  });

  it('posts with the generate=tuple discriminator and the row-add/row-remove intent', () => {
    const html = renderToString(ProposedDatesSection({...baseProps(), generateRows: 3}));

    expect(html).toContain('name="generate" value="tuple"');
    expect(html).toContain('name="action" value="grow"');
    expect(html).toContain('name="action" value="remove"');
    expect(html).toContain('formaction="/edit/session-1/proposed-dates?rowIndex=1"');
    expect(html).toContain('formaction="/edit/session-1/proposed-dates?rowIndex=2"');
  });

  it('mirrors the single-date field placeholder and lang on each time input', () => {
    const props = {...baseProps(), generateRows: 2, locale: 'de-CH' as const, inputFormat: 'dd.MM.yyyy HH:mm'};
    const html = renderToString(ProposedDatesSection(props));

    expect(html.match(/name="time\[\]"/g)?.length ?? 0).toBe(2);
    expect(html.match(/placeholder="dd\.MM\.yyyy HH:mm"/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
    expect(html.match(/lang="de-CH"/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
  });

  it('emits every weekday label inside the locale-aware weekday select', () => {
    const html = renderToString(ProposedDatesSection(baseProps()));

    expect(html).toContain('<option value="1"');
    expect(html).toContain('<option value="7"');
    expect(html).toContain('>Mo</option>');
    expect(html).toContain('>Su</option>');
  });

  it('greys out the Add weekday button when the cap of 14 is reached', () => {
    const html = renderToString(ProposedDatesSection({...baseProps(), generateRows: 14}));

    expect(html).toContain('name="action" value="grow" disabled=""');
    expect((html.match(/name="weekday\[\]"/g) ?? []).length).toBe(14);
    expect((html.match(/name="action" value="remove"/g) ?? []).length).toBe(14);
  });

  it('keeps the lone row\'s remove button disabled so users cannot trim to zero', () => {
    const html = renderToString(ProposedDatesSection(baseProps()));

    expect(html).toMatch(/name="action" value="remove"[^>]*disabled/);
  });

  it('enables the remove button once the form has 2+ tuple rows', () => {
    const html = renderToString(ProposedDatesSection({...baseProps(), generateRows: 2}));

    const removeButtons = (html.match(/<button[^>]*name="action" value="remove"[^>]*>/g) ?? []);
    expect(removeButtons.length).toBe(2);
    for (const tag of removeButtons) {
      expect(tag).not.toContain('disabled');
    }
  });

  it('hides the generator block alongside the single-add form when Confirmed', () => {
    const html = renderToString(ProposedDatesSection({...baseProps(), status: 'Confirmed'}));

    expect(html).not.toContain('Generate Proposed Dates');
    expect(html).not.toContain('name="weekday[]"');
    expect(html).not.toContain('name="time[]"');
    expect(html).not.toContain('name="generate" value="tuple"');
  });

  it('renders the success toast with the localized count when n >= 1', () => {
    const html = renderToString(ProposedDatesSection({...baseProps(), generatorSuccessCount: 12}));

    expect(html).toContain('class="toast success top mt-2"');
    expect(html).toContain('12 dates added');
  });

  it('renders the inline zero-result message from the generatorError prop', () => {
    const html = renderToString(ProposedDatesSection({...baseProps(), generatorError: 'No dates were added. Adjust the patterns and try again.'}));

    expect(html).toContain('class="error mt-2" role="alert"');
    expect(html).toContain('No dates were added.');
  });

  it('clamps absurd row counts to the 14-row cap on render', () => {
    const html = renderToString(ProposedDatesSection({...baseProps(), generateRows: 999}));

    expect((html.match(/name="weekday\[\]"/g) ?? []).length).toBe(14);
    expect(html).toContain('name="action" value="grow" disabled=""');
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

    expect(html).toContain('id="error-container" hx-swap-oob="true"');
    expect(html).toContain('<p class="chip outline" id="status-chip" hx-swap-oob="true">');
    expect(html).toContain('id="proposed-dates-management"');
    expect(html).toContain('id="vote-tally-section" hx-swap-oob="true"');
    expect(html).toContain('<section id="own-team-votes" class="padding small-round surface-variant" hx-swap-oob="true"');
    expect(html).not.toContain('<!DOCTYPE html>');
    expect(html).not.toContain('<html');
  });

  it('surfaces the global error inside the out-of-band error container', () => {
    const html = renderToString(ProposedDatesSectionPartial({
      ...baseProps(),
      globalError: 'Something went wrong',
    }));

    expect(html).toContain('error padding white-text');
    expect(html).toContain('Something went wrong');
  });
});
