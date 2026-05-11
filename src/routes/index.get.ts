import { Context } from 'hono';
import { render } from '../lib/renderer';

export const handleIndexGet = (c: Context) => {
  const isPartial = !!c.req.header('HX-Request');
  const html = render('index.eta', {title: 'Game Re-scheduler', isPartial});
  return c.html(html);
};
