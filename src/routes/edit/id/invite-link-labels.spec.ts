import { describe, expect, it } from 'vitest';
import { aSession } from '../../../lib/__test-utils__/builders';
import { getTranslation } from '../../../locales';
import type { TranslationKeys } from '../../../locales';
import type { Postponement } from '../../../lib/models';
import { inviteLinkLabels } from './invite-link-labels';

const t = (key: TranslationKeys, params?: Record<string, string>): string =>
  getTranslation('en-US', key, params);

describe('inviteLinkLabels', () => {
  it('labels the home side as own team when the organizer is on the home side', () => {
    const session: Postponement = aSession({organizerTeam: 'home'});

    expect(inviteLinkLabels(session, t)).toEqual({
      home: 'My team invitation link (Home Team)',
      away: 'Opponent team invitation link (Guest Team)',
    });
  });

  it('swaps the perspective when the organizer is on the away side', () => {
    const session: Postponement = aSession({organizerTeam: 'away'});

    expect(inviteLinkLabels(session, t)).toEqual({
      home: 'Opponent team invitation link (Home Team)',
      away: 'My team invitation link (Guest Team)',
    });
  });

  it('renders the plain label without parentheses when a side has no team name', () => {
    const session: Postponement = aSession();

    session.homeTeam = undefined;
    session.guestTeam = undefined;

    expect(inviteLinkLabels(session, t)).toEqual({
      home: 'My team invitation link',
      away: 'Opponent team invitation link',
    });
  });

  it('renders each side independently when only one name is missing', () => {
    const session: Postponement = aSession();

    session.homeTeam = undefined;

    expect(inviteLinkLabels(session, t)).toEqual({
      home: 'My team invitation link',
      away: 'Opponent team invitation link (Guest Team)',
    });
  });

  it('interpolates arbitrary team names verbatim', () => {
    const session: Postponement = aSession({homeTeam: 'TT Zürich 1', guestTeam: 'SV Bern A'});

    expect(inviteLinkLabels(session, t)).toEqual({
      home: 'My team invitation link (TT Zürich 1)',
      away: 'Opponent team invitation link (SV Bern A)',
    });
  });
});
