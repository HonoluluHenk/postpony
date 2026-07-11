import { factory, handleAppRequest } from '../../lib/hono-factory';
import { handleEditGet } from './id/edit-id-get';
import { handleEditPlayersPost } from './id/players-post';
import { handleEditVenuePost } from './id/venue-post';

const editRouter = factory.createApp();

editRouter.post('/:id/venue', handleAppRequest(handleEditVenuePost));
editRouter.post('/:id/players', handleAppRequest(handleEditPlayersPost));
editRouter.get('/:id', handleAppRequest(handleEditGet));

export default editRouter;
