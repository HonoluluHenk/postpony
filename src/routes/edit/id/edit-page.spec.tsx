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
    matchDateTime: '08/29/2026 04:00 pm',
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
      .toContain('Match: Home Team vs Guest Team – 08/29/2026 04:00 pm');
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
