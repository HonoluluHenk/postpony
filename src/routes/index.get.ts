import type { App } from '../app';

export const handleIndexGet = (app: App) => {
  const html = app.render('index.eta', {title: 'Game Re-scheduler', isPartial: app.isPartial});
  return app.c.html(html);
};
