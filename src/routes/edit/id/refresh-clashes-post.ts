import type { App } from '../../../app';
import { attachClashes, computeClashesForSession } from './proposed-dates-post';
import { renderEditPartials } from './render-edit-partials';

export const handleRefreshClashesPost = async (app: App): Promise<Response> => {
  const id = app.requireParam('id');
  const session = await app.store.get(id);
  if (!session) {
    app.notFound(app.t('session_not_found'));
  }

  const clashes = await computeClashesForSession(session);
  const refreshed = clashes === undefined ? session : attachClashes(session, clashes);
  await app.store.save(refreshed);

  if (app.isPartial) {
    const clashCheckable =
      session.homeTeamIdentity !== undefined && session.guestTeamIdentity !== undefined;
    const html = renderEditPartials(app, refreshed, clashCheckable && clashes === undefined
      ? {refreshError: true}
      : {});
    return app.c.html(html);
  }
  return app.c.redirect(`/edit/${id}?ownerPassword=${app.c.req.query('ownerPassword') ?? ''}`);
};