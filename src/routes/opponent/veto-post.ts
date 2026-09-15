import type { App } from '../../app';
import { runOpponentCommand } from './run-opponent-command';

export const handleOpponentVetoPost = (app: App): Promise<Response> => {
  const proposedDateId = app.query('proposedDateId') ?? '';
  const vetoed = app.query('vetoed') === 'true';

  return runOpponentCommand(app, {
    apply: (rules, session) => rules.setVetoed(session, proposedDateId, vetoed),
    message: app.t(vetoed ? 'opponent_vetoed' : 'opponent_unvetoed'),
    alwaysRender: true,
  });
};
