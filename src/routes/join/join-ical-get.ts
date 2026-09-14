import type { App } from '../../app';
import { buildIcal, icalFilename, icalResponseHeaders } from '../../lib/ical';
import { requireSessionAndToken, requireTeam } from './join-utils';

/**
 * Read-only calendar export for the participant's vote page. Guarded by the
 * invitation token only — no `playerId` is required, because a calendar file is
 * not sensitive and invite links are already shared widely. A bad token is a
 * 403, an unknown session id a 404, and an invalid team a 400.
 *
 * An optional `playerId` that identifies a Participant on this team personalizes
 * every embedded link; a missing or stale id degrades silently to an
 * unpersonalized file so an old subscription keeps producing a usable calendar.
 */
export const handleJoinIcalGet = async (app: App): Promise<Response> => {
  const team = requireTeam(app);
  const {session, token} = await requireSessionAndToken(app);

  const playerId = app.query('playerId') ?? '';
  const knownPlayer = session.players.some((p) => p.id === playerId && p.teamId === team);

  const body = buildIcal(session, {
    baseUrl: app.view.baseUrl,
    locale: app.locale,
    token,
    team,
    playerId: knownPlayer ? playerId : undefined,
    labels: {
      action: app.t('vote_action_label'),
      yes: app.t('vote_yes'),
      no: app.t('vote_no'),
      ifNecessary: app.t('vote_if_necessary'),
    },
    linkLabels: {
      open: app.t('ical_open_poll'),
      yes: app.t('ical_vote_yes'),
      ifNecessary: app.t('ical_vote_if_necessary'),
      no: app.t('ical_vote_no'),
    },
  });
  return new Response(body, {status: 200, headers: icalResponseHeaders(icalFilename(session.name))});
};
