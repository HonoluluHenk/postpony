import type { App } from '../../../app';
import { attachClashCheckResult, computeClashesForSession } from './proposed-dates-post';
import { renderEditPartials } from './render-edit-partials';

export const handleRefreshClashesPost = async (app: App): Promise<Response> => {
  const id = app.requireParam('id');
  const session = await app.store.get(id);
  if (!session) {
    app.notFound(app.t('session_not_found'));
  }

  const checkResult = await computeClashesForSession(session);
  const refreshed = checkResult === undefined ? session : attachClashCheckResult(session, checkResult);
  await app.store.save(refreshed);

  if (app.isPartial) {
    // Only claim "showing the previous results" when a previous snapshot
    // actually exists; a first check that fails renders the plain nothing state.
    const hadSnapshot = session.proposedDates.some((pd) => pd.clashes !== undefined);
    const html = renderEditPartials(app, refreshed, checkResult === undefined && hadSnapshot
      ? {refreshError: true}
      : {});
    return app.c.html(html);
  }
  return app.c.redirect(`/edit/${id}?ownerPassword=${app.c.req.query('ownerPassword') ?? ''}`);
};
