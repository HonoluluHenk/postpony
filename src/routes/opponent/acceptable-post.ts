import type { App } from '../../app';
import { runOpponentCommand } from './run-opponent-command';

export const handleOpponentAcceptablePost = (app: App): Promise<Response> => {
  const proposedDateId = app.query('proposedDateId') ?? '';
  const acceptable = app.query('acceptable') === 'true';

  return runOpponentCommand(app, {
    apply: (rules, session) => rules.setAcceptable(session, proposedDateId, acceptable),
    message: app.t(acceptable ? 'opponent_acceptable_set' : 'opponent_acceptable_unset'),
    alwaysRender: true,
  });
};
