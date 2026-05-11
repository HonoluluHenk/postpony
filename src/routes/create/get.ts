import type { App } from '../../app';
import { render } from '../../lib/renderer';

export const handleCreateGet = (app: App) => {
  const html = render('create.eta', {title: 'Create a new ReSchedule', isPartial: app.isPartial});
  return app.c.html(html);
};
