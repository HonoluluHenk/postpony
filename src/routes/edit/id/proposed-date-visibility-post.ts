import type { App } from '../../../app';
import { runEditCommand } from './run-edit-command';

export const handleProposedDateVisibilityPost = (app: App): Promise<Response> => {
  const proposedDateId = app.c.req.query('proposedDateId') ?? '';
  const votable = app.c.req.query('votable') === 'true';

  return runEditCommand(app, {
    apply: (rules, session) => rules.setVotable(session, proposedDateId, votable),
    message: app.t(votable ? 'voting_enabled' : 'voting_disabled'),
    alwaysRender: true,
  });
};
