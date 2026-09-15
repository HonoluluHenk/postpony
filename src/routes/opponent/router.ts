import { factory, handleAppRequest } from '../../lib/hono-factory';
import { handleOpponentAcceptedPost } from './accepted-post';
import { handleOpponentGet } from './opponent-get';
import { handleOpponentPlayersPost } from './players-post';
import { handleOpponentRefreshPost } from './refresh-clashes-post';
import { handleOpponentVotablePost } from './votable-post';

const opponentRouter = factory.createApp();

opponentRouter.post('/:id/players', handleAppRequest(handleOpponentPlayersPost));
opponentRouter.post('/:id/votable', handleAppRequest(handleOpponentVotablePost));
opponentRouter.post('/:id/accepted', handleAppRequest(handleOpponentAcceptedPost));
opponentRouter.post('/:id/refresh-clashes', handleAppRequest(handleOpponentRefreshPost));
opponentRouter.get('/:id', handleAppRequest(handleOpponentGet));

export default opponentRouter;
