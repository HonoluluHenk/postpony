import type { App } from '../../app';
import { runOpponentCommand } from './run-opponent-command';

export const handleOpponentVotablePost = (app: App): Promise<Response> => {
  const proposedDateId = app.query('proposedDateId') ?? '';
  const opponentVotable = app.query('opponentVotable') === 'true';

  return runOpponentCommand(app, {
    apply: (rules, session) => rules.setOpponentVotable(session, proposedDateId, opponentVotable),
    message: app.t(opponentVotable ? 'opponent_votable_enabled' : 'opponent_votable_disabled'),
    alwaysRender: true,
  });
};
