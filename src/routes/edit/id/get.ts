import { Context } from 'hono';
import { render } from '../../../lib/renderer';
import { sessions } from '../../../lib/session-store';

export const handleEditGet = (c: Context) => {
  const id = c.req.param('id');
  if (!id) {
    return c.text('ID is required', 400);
  }
  const session = sessions[id];
  if (!session) {
    return c.text('Session not found', 404);
  }

  const isPartial = !!c.req.header('HX-Request');
  const html = render('edit.eta', {
    title: `Editing ${session.name}`,
    session,
    ownerPassword: null,
    isPartial,
  });
  return c.html(html);
};
