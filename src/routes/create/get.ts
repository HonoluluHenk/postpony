import type { App } from '../../app';

export const handleCreateGet = (app: App) => {
  const html = app.render('create.eta', {title: 'Create a new ReSchedule', isPartial: app.isPartial});
  return app.c.html(html);
};
