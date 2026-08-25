import type { Postponement, Team } from '../../../lib/models';
import type { TranslateFn } from '../../../locales';

export interface InviteLinkLabels {
  home: string;
  away: string;
}

/**
 * Labels the two invitation links from the organizer's perspective: the link for
 * `organizerTeam` reads "my team", the other side "opponent". A side without a
 * stored team name gets the plain label without parentheses.
 */
export function inviteLinkLabels(session: Postponement, t: TranslateFn): InviteLinkLabels {
  function label(side: Team): string {
    const name = side === 'home' ? session.homeTeam : session.guestTeam;
    if (side === session.organizerTeam) {
      return name === undefined ? t('invite_link_own_label') : t('invite_link_own_label_named', {teamName: name});
    }
    return name === undefined ? t('invite_link_opponent_label') : t('invite_link_opponent_label_named', {teamName: name});
  }

  return {home: label('home'), away: label('away')};
}
