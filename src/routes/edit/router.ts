import { factory, handleAppRequest } from '../../lib/hono-factory';
import { handleConfirmDatePost } from './id/confirm-date-post';
import { handleEditGet } from './id/edit-id-get';
import { handleEditPlayersPost } from './id/players-post';
import { handleProposedDateDeletePost } from './id/proposed-date-delete-post';
import { handleProposedDateVisibilityPost } from './id/proposed-date-visibility-post';
import { handleEditProposedDatesPost } from './id/proposed-dates-post';
import { handleReopenPost } from './id/reopen-post';

const editRouter = factory.createApp();

editRouter.post('/:id/players', handleAppRequest(handleEditPlayersPost));
editRouter.post('/:id/proposed-dates', handleAppRequest(handleEditProposedDatesPost));
editRouter.post('/:id/proposed-date-visibility', handleAppRequest(handleProposedDateVisibilityPost));
editRouter.post('/:id/proposed-date-confirm', handleAppRequest(handleConfirmDatePost));
editRouter.post('/:id/proposed-date-delete', handleAppRequest(handleProposedDateDeletePost));
editRouter.post('/:id/reopen', handleAppRequest(handleReopenPost));
editRouter.get('/:id', handleAppRequest(handleEditGet));

export default editRouter;
