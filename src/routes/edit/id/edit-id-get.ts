import type { App } from '../../../app';

export const handleEditGet = (app: App) => {
  const id = app.requireParam('id');
  const session = app.sessions[id];
  if (!session) {
    app.notFound(app.t('session_not_found'));
  }

  const ownerPassword = app.c.req.query('ownerPassword') || null;
  const isPartial = app.isPartial;
  const html = app.render('edit/id/edit.eta', {
    title: app.t('edit_reschedule_title', {name: session.name}),
    session,
    ownerPassword,
    isPartial,
  });
  return app.c.html(html);
};
