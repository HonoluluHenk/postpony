import type { App } from '../../app';
import { buildIcal, icalFilename, icalResponseHeaders } from '../../lib/ical';
import { requireSessionAndToken, requireTeam } from './join-utils';

/**
 * Read-only calendar export for the participant's vote page. Guarded by the
 * invitation token only — no `playerId` is required, because a calendar file is
 * not sensitive and invite links are already shared widely. A bad token is a
 * 403, an unknown session id a 404, and an invalid team a 400.
 */
export const handleJoinIcalGet = async (app: App): Promise<Response> => {
  requireTeam(app);
  const {session} = await requireSessionAndToken(app);

  const body = buildIcal(session, {baseUrl: app.view.baseUrl, locale: app.locale});
  return new Response(body, {status: 200, headers: icalResponseHeaders(icalFilename(session.name))});
};
