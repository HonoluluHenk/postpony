import type { App } from '../../app';
import { runOpponentCommand } from './run-opponent-command';

export const handleOpponentAcceptedPost = (app: App): Promise<Response> => {
  const proposedDateId = app.query('proposedDateId') ?? '';
  const accepted = app.query('accepted') === 'true';

  return runOpponentCommand(app, {
    apply: (rules, session) => rules.setAccepted(session, proposedDateId, accepted),
    message: app.t(accepted ? 'opponent_accepted_set' : 'opponent_accepted_unset'),
    alwaysRender: true,
  });
};
