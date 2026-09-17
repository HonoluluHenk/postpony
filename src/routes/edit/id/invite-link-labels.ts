import type { Postponement } from '../../../lib/models';
import type { TranslateFn } from '../../../locales';
import { opponentTeam } from '../../opponent/opponent-utils';

export interface InviteLinkLabels {
  own: string;
  opponentCaptain: string;
}

/**
 * Labels the two invitation links the organizer's edit page renders: the link for
 * `organizerTeam` reads "my team", the opponent side's captain link reads "opponent
 * captain". A side without a stored team name gets the plain label without parentheses.
 */
export function inviteLinkLabels(session: Postponement, t: TranslateFn): InviteLinkLabels {
  function ownLabel(): string {
    const side = session.organizerTeam;
    const name = side === 'home' ? session.homeTeam : session.guestTeam;
    return name === undefined ? t('invite_link_own_label') : t('invite_link_own_label_named', {teamName: name});
  }

  function captainLabel(): string {
    const side = opponentTeam(session);
    const name = side === 'home' ? session.homeTeam : session.guestTeam;
    return name === undefined
           ? t('invite_link_opponent_captain_label')
           : t('invite_link_opponent_captain_label_named', {teamName: name});
  }

  return {own: ownLabel(), opponentCaptain: captainLabel()};
}
