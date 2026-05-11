import type { App } from '../../../app';
import { render } from '../../../lib/renderer';

export const handleEditGet = (app: App) => {
  const id = app.requireParam('id');
  const session = app.sessions[id];
  if (!session) {
    return app.c.text('Session not found', 404);
  }

  const isPartial = app.isPartial;
  const html = render('edit.eta', {
    title: `Editing ${session.name}`,
    session,
    ownerPassword: null,
    isPartial,
  });
  return app.c.html(html);
};
