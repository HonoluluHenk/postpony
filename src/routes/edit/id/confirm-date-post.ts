import type { App } from '../../../app';
import { PostponementRules } from '../../../lib/postponement';
import { renderEditPartials } from './render-edit-partials';

export const handleConfirmDatePost = async (app: App): Promise<Response> => {
  const id = app.requireParam('id');
  const session = await app.store.get(id);
  if (!session) {
    app.notFound(app.t('session_not_found'));
  }

  const proposedDateId = app.c.req.query('proposedDateId') ?? '';
  const updated = new PostponementRules().confirmDate(session, proposedDateId);
  if (updated !== session) {
    await app.store.save(updated);
  }

  const confirmedDate = updated.proposedDates.find((pd) => pd.id === updated.confirmedProposedDateId);
  const clashes = confirmedDate?.clashes;
  const hasClashes = clashes !== undefined && (clashes.home.length > 0 || clashes.away.length > 0);

  if (app.isPartial) {
    const html = renderEditPartials(app, updated, hasClashes ? {confirmClashWarning: true} : {});
    return app.c.html(html);
  }
  return app.c.redirect(`/edit/${id}?ownerPassword=${app.c.req.query('ownerPassword') ?? ''}`);
};