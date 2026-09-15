import type { App } from '../../app';
import { requireOpponentCaptain } from './opponent-utils';
import { renderOpponent } from './render-opponent';

export const handleOpponentGet = async (app: App): Promise<Response> => {
  const id = app.requireParam('id');
  const session = await app.store.get(id);
  if (!session) {
    app.notFound(app.t('session_not_found'));
  }
  await requireOpponentCaptain(app, session);

  return app.html(renderOpponent(app, session));
};
