import { factory, handleAppRequest } from '../../lib/hono-factory';
import { handleEditGet } from './id/edit-id-get';
import { handleEditPlayersPost } from './id/players-post';
import { handleEditProposedDatesPost } from './id/proposed-dates-post';
import { handleEditVenuePost } from './id/venue-post';

const editRouter = factory.createApp();

editRouter.post('/:id/venue', handleAppRequest(handleEditVenuePost));
editRouter.post('/:id/players', handleAppRequest(handleEditPlayersPost));
editRouter.post('/:id/proposed-dates', handleAppRequest(handleEditProposedDatesPost));
editRouter.get('/:id', handleAppRequest(handleEditGet));

export default editRouter;
