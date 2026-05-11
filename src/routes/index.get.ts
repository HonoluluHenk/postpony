import type { App } from '../app';

export const handleIndexGet = (app: App) => {
  const html = app.render('index.eta', {title: app.t('app_title'), isPartial: app.isPartial});
  return app.c.html(html);
};
