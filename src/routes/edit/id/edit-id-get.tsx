import type { App } from '../../../app';
import { formatIsoToLocaleTokens, formatProposedDateDisplay } from '../../../lib/temporal-utils';
import { EditPage } from './edit';
import { organizerPasswordFromRequest, requireOrganizerCaptain } from './edit-auth';
import { defaultGeneratorDateRange } from './proposed-dates-post';
import { buildEditPartialsData } from './render-edit-partials';

export const handleEditGet = async (app: App): Promise<Response> => {
  const id = app.requireParam('id');
  const session = await app.store.get(id);
  if (!session) {
    app.notFound(app.t('session_not_found'));
  }
  await requireOrganizerCaptain(app, session);

  const organizerPassword = organizerPasswordFromRequest(app) || undefined;
  const locale = app.locale;

  const originalMatchDateTime = session.originalMatchDateTime
    ? formatIsoToLocaleTokens(session.originalMatchDateTime, locale)
    : '';
  const originalMatchDateTimeDisplay = session.originalMatchDateTime
    ? formatProposedDateDisplay(session.originalMatchDateTime, locale)
    : '';

  const {fromDate, toDate} = defaultGeneratorDateRange(locale, session.originalMatchDateTime);
  const sort = app.query('sort') === 'availability' ? 'availability' : 'date';

  const html = app.render(
    <EditPage
      {...app.view}
      title={app.t('edit_postponement_title', {name: session.name})}
      session={session}
      organizerPassword={organizerPassword}
      proposedDateTime={originalMatchDateTime}
      proposedDateTimeDisplay={originalMatchDateTimeDisplay}
      fromDate={fromDate}
      toDate={toDate}
      {...buildEditPartialsData(session, locale, sort)}
    />,
  );

  return app.html(html);
};
