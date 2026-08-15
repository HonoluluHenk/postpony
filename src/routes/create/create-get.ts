import type { App } from '../../app';

export function handleCreateGet(app: App): Response {
  const html = app.render('create/create.eta', {title: app.t('create_postponement_title'), isPartial: app.isPartial});
  return app.c.html(html);
}
