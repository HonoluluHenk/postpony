import type { App } from '../../../app';
import { runEditCommand } from './run-edit-command';

export const handleReopenPost = (app: App): Promise<Response> =>
  runEditCommand(app, {
    apply: (rules, session) => rules.reopen(session),
    message: app.t('postponement_reopened'),
  });
