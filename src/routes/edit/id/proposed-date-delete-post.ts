import type { App } from '../../../app';
import { runEditCommand } from './run-edit-command';

export const handleProposedDateDeletePost = (app: App): Promise<Response> =>
  runEditCommand(app, {
    apply: (rules, session) => rules.deleteProposedDate(session, app.query('proposedDateId') ?? ''),
    message: app.t('proposed_date_deleted'),
  });
