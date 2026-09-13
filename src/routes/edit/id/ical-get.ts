import type { App } from '../../../app';
import { buildIcal, icalFilename, icalResponseHeaders } from '../../../lib/ical';

/**
 * Read-only calendar export for the organizer's edit page. Matches the edit
 * page's public-read model: no password is required. An unknown session id is a
 * 404; the serialization lives in `buildIcal`.
 */
export const handleEditIcalGet = async (app: App): Promise<Response> => {
  const id = app.requireParam('id');
  const session = await app.store.get(id);
  if (!session) {
    app.notFound(app.t('session_not_found'));
  }

  const body = buildIcal(session, {
    baseUrl: app.view.baseUrl,
    locale: app.locale,
    linkLabels: {open: app.t('ical_open_edit')},
  });
  return new Response(body, {status: 200, headers: icalResponseHeaders(icalFilename(session.name))});
};
