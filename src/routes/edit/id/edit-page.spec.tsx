import { describe, expect, it } from 'vitest';
import { aSession } from '../../../lib/__test-utils__/builders';
import { getTranslation, languageOptions } from '../../../locales';
import { EditPage, type EditPageProps } from './edit';

const t = (key: any, params?: any): string => getTranslation('en-US', key, params);

function baseProps(): EditPageProps {
  const session = aSession({
    homeTeam: 'Home Team',
    guestTeam: 'Guest Team',
    originalMatchDateTime: '2026-08-29T16:00',
  });
  return {
    session,
    t,
    locale: 'en-US',
    baseUrl: 'https://game-scheduler.localhost:3000',
    inputFormat: 'MM/dd/yyyy hh:mm aa',
    isPartial: false,
    languageOptions: languageOptions(),
    proposedDates: [],
    homeProposedDates: [],
    awayProposedDates: [],
    clashCheckable: false,
    venues: [],
    organizerPlayers: [],
    ownTeamResults: [],
    proposedDateTimeDisplay: 'Sa, Aug 29, 2026, 4:00 PM',
    matchDateTime: 'Sa, Aug 29, 2026, 4:00 PM',
    homeTeam: 'Home Team',
    guestTeam: 'Guest Team',
  };
}

function renderToString(node: unknown): string {
  if (node === null || node === undefined) {
    return '';
  }
  return (node as { toString(): string }).toString();
}

describe('EditPage match summary', () => {
  it('renders the referenced Match identity read-only and no change action', () => {
    const html = renderToString(EditPage(baseProps()));

    expect(html)
      .toContain('Match: Home Team vs Guest Team – Sa, Aug 29, 2026, 4:00 PM');
    expect(html)
      .not
      .toContain('change_match_details');
    expect(html)
      .not
      .toContain('Change match details');
    expect(html)
      .not
      .toContain('/create?sessionId=');
  });
});

describe('EditPage status chip', () => {
  it('renders the status label with the translated English status value', () => {
    const session = aSession({status: 'Voting'});
    const html = renderToString(EditPage({...baseProps(), session}));

    expect(html)
      .toContain('<p class="chip outline" id="status-chip">Status: Voting</p>');
  });

  it('renders a German status value on a de-CH page', () => {
    const tDe = (key: any, params?: any): string => getTranslation('de-CH', key, params);
    const session = aSession({status: 'Voting'});
    const html = renderToString(EditPage({...baseProps(), t: tDe, session}));

    expect(html)
      .toContain('<p class="chip outline" id="status-chip">Status: Abstimmung</p>');
    expect(html)
      .not
      .toContain('Status: Voting');
  });

  it('translates Draft and Confirmed through the status keys', () => {
    const session = aSession({status: 'Confirmed'});
    const html = renderToString(EditPage({...baseProps(), session}));

    expect(html)
      .toContain('<p class="chip outline" id="status-chip">Status: Confirmed</p>');

    const tDe = (key: any, params?: any): string => getTranslation('de-CH', key, params);
    const deSession = aSession({status: 'Draft'});
    const deHtml = renderToString(EditPage({...baseProps(), t: tDe, session: deSession}));

    expect(deHtml)
      .toContain('<p class="chip outline" id="status-chip">Status: Entwurf</p>');
  });
});

describe('EditPage heading date', () => {
  it('renders the original match datetime in the Intl reading format', () => {
    const html = renderToString(EditPage(baseProps()));

    expect(html)
      .toContain('Sa, Aug 29, 2026, 4:00 PM');
    expect(html)
      .not
      .toContain('08/29/2026 04:00 pm');
  });
});

describe('EditPage organizer-password toast', () => {
  it('announces the success notice as a polite status, not an alert', () => {
    const html = renderToString(EditPage({...baseProps(), organizerPassword: 'pw-123'}));

    expect(html)
      .toContain('role="status"');
    expect(html)
      .toContain('Postponement created successfully!');
    expect(html)
      .not
      .toContain('role="alert"');
  });

  it('protects the password value from machine translation', () => {
    const html = renderToString(EditPage({...baseProps(), organizerPassword: 'pw-123'}));

    expect(html)
      .toContain('<span class="password-display" translate="no">pw-123</span>');
  });
});

describe('EditPage clipboard announcement', () => {
  it('renders a visually-hidden role="status" element for clipboard feedback in the initial render', () => {
    const html = renderToString(EditPage(baseProps()));

    expect(html)
      .toContain('<p id="clipboard-status" class="visually-hidden" role="status"></p>');
  });

  it('carries the localized copied label as a data attribute on both copy buttons', () => {
    const html = renderToString(EditPage(baseProps()));

    expect(html)
      .toContain('data-copied-label="Copied to clipboard"');
    expect(html.match(/class="clipboard-btn"/g))
      .toHaveLength(2);
  });
});
