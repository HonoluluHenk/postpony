import { factory, handleAppRequest } from '../../lib/hono-factory';
import { handleOpponentAcceptablePost } from './acceptable-post';
import { handleOpponentGet } from './opponent-get';
import { handleOpponentPlayersPost } from './players-post';
import { handleOpponentVetoPost } from './veto-post';

const opponentRouter = factory.createApp();

opponentRouter.post('/:id/players', handleAppRequest(handleOpponentPlayersPost));
opponentRouter.post('/:id/veto', handleAppRequest(handleOpponentVetoPost));
opponentRouter.post('/:id/acceptable', handleAppRequest(handleOpponentAcceptablePost));
opponentRouter.get('/:id', handleAppRequest(handleOpponentGet));

export default opponentRouter;
