import type { App } from '../../../app';
import { PostponementRules } from '../../../lib/postponement';
import { renderEditPartials } from './render-edit-partials';

export const handleProposedDateVisibilityPost = async (app: App): Promise<Response> => {
  const id = app.requireParam('id');
  const session = await app.store.get(id);
  if (!session) {
    app.notFound(app.t('session_not_found'));
  }

  const proposedDateId = app.c.req.query('proposedDateId') ?? '';
  const votable = app.c.req.query('votable') === 'true';

  const updated = new PostponementRules().setVotable(session, proposedDateId, votable);
  await app.store.save(updated);

  const html = renderEditPartials(app, updated, {
    statusMessage: app.t(votable ? 'voting_enabled' : 'voting_disabled'),
  });
  return app.c.html(html);
};