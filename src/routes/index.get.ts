import type { App } from '../app';
import { render } from '../lib/renderer';

export const handleIndexGet = (app: App) => {
  const html = render('index.eta', {title: 'Game Re-scheduler', isPartial: app.isPartial});
  return app.c.html(html);
};
