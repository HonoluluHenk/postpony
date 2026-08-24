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
