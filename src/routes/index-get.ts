import type { App } from '../app';

export function handleIndexGet(app: App): Response {
  const html = app.render('index.eta', {title: app.t('app_title'), isPartial: app.isPartial});
  return app.c.html(html);
}
