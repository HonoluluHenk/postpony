import { factory, handleAppRequest } from '../../lib/hono-factory';
import { handleJoinGet } from './join-get';
import { handleJoinIcalGet } from './join-ical-get';
import { handleJoinRegisterPost } from './join-register-post';
import { handleJoinVoteGet } from './join-vote-get';
import { handleJoinVotePost } from './join-vote-post';

const joinRouter = factory.createApp();

joinRouter.post('/:id/:team/register', handleAppRequest(handleJoinRegisterPost));
joinRouter.post('/:id/:team/vote', handleAppRequest(handleJoinVotePost));
joinRouter.get('/:id/:team/vote', handleAppRequest(handleJoinVoteGet));
joinRouter.get('/:id/:team/calendar.ics', handleAppRequest(handleJoinIcalGet));
joinRouter.get('/:id/:team', handleAppRequest(handleJoinGet));

export default joinRouter;
