import type { App } from '../../../app';
import { PostponementRules } from '../../../lib/postponement';
import { renderEditPartials } from './render-edit-partials';

export const handleReopenPost = async (app: App): Promise<Response> => {
  const id = app.requireParam('id');
  const session = await app.store.get(id);
  if (!session) {
    app.notFound(app.t('session_not_found'));
  }

  const updated = new PostponementRules().reopen(session);
  await app.store.save(updated);

  if (app.isPartial) {
    const html = renderEditPartials(app, updated);
    return app.c.html(html);
  }
  return app.c.redirect(`/edit/${id}?ownerPassword=${app.c.req.query('ownerPassword') ?? ''}`);
};