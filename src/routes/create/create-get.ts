import type { App } from '../../app';

export const handleCreateGet = (app: App) => {
  const html = app.render('create/create.eta', {title: app.t('create_reschedule_title'), isPartial: app.isPartial});
  return app.c.html(html);
};
