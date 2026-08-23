import type { App } from '../../../app';
import { formatIsoToLocaleTokens } from '../../../lib/temporal-utils';
import { buildEditPartialsData } from './render-edit-partials';

export const handleEditGet = async (app: App): Promise<Response> => {
  const id = app.requireParam('id');
  const session = await app.store.get(id);
  if (!session) {
    app.notFound(app.t('session_not_found'));
  }

  const ownerPassword = app.c.req.query('ownerPassword') ?? null;
  const isPartial = app.isPartial;
  const locale = app.locale;

  const originalMatchDateTime = session.originalMatchDateTime
    ? formatIsoToLocaleTokens(session.originalMatchDateTime, locale)
    : '';

  const html = app.render('edit/id/edit.eta', {
    title: app.t('edit_postponement_title', {name: session.name}),
    session,
    proposedDateTime: originalMatchDateTime,
    ownerPassword,
    invitationPassword: session.invitationPassword,
    isPartial,
    ...buildEditPartialsData(session, locale),
  });

  return app.c.html(html);
};