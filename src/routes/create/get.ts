import { Context } from 'hono';
import { render } from '../../lib/renderer';

export const handleCreateGet = (c: Context) => {
  const isPartial = !!c.req.header('HX-Request');
  const html = render('create.eta', {title: 'Create a new ReSchedule', isPartial});
  return c.html(html);
};
