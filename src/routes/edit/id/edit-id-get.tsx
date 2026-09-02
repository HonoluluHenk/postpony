import type { App } from '../../../app';
import { formatIsoToLocaleTokens } from '../../../lib/temporal-utils';
import { EditPage } from './edit';
import { defaultGeneratorDateRange } from './proposed-dates-post';
import { buildEditPartialsData } from './render-edit-partials';

export const handleEditGet = async (app: App): Promise<Response> => {
  const id = app.requireParam('id');
  const session = await app.store.get(id);
  if (!session) {
    app.notFound(app.t('session_not_found'));
  }

  const organizerPassword = app.c.req.query('organizerPassword') ?? null;
  const locale = app.locale;

  const originalMatchDateTime = session.originalMatchDateTime
    ? formatIsoToLocaleTokens(session.originalMatchDateTime, locale)
    : '';

  const {fromDate, toDate} = defaultGeneratorDateRange(locale, session.originalMatchDateTime);

  const html = app.render(
    <EditPage
      {...app.view}
      title={app.t('edit_postponement_title', {name: session.name})}
      session={session}
      organizerPassword={organizerPassword ?? undefined}
      proposedDateTime={originalMatchDateTime}
      homeTeam={session.homeTeam}
      guestTeam={session.guestTeam}
      matchDateTime={originalMatchDateTime}
      fromDate={fromDate}
      toDate={toDate}
      {...buildEditPartialsData(session, locale)}
    />,
  );

  return app.c.html(html);
};
