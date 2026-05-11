import type { App } from '../../../app';

export const handleEditGet = (app: App) => {
  const id = app.requireParam('id');
  const session = app.sessions[id];
  if (!session) {
    app.notFound('Session not found');
  }

  const ownerPassword = app.c.req.query('ownerPassword') || null;
  const isPartial = app.isPartial;
  const html = app.render('edit.eta', {
    title: `Editing ${session.name}`,
    session,
    ownerPassword,
    isPartial,
  });
  return app.c.html(html);
};
