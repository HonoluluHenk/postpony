import type { App } from '../../../app';
import { formatIsoToLocaleTokens, formatProposedDateDisplay } from '../../../lib/temporal-utils';
import { EditPage, type EditPageProps } from './edit';
import { organizerPasswordFromRequest, requireOrganizerCaptain } from './edit-auth';
import { defaultGeneratorDateRange } from './proposed-dates-post';
import { buildEditPartialsData, renderEditGridPartial } from './render-edit-partials';
import { currentSortParam } from '../../partials/sort-control';

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
  const sort = currentSortParam(app);

  const props: EditPageProps = {
    ...app.view,
    title: app.t('edit_postponement_title', {name: session.name}),
    session,
    organizerPassword,
    currentUrl: app.currentUrl(),
    proposedDateTime: originalMatchDateTime,
    proposedDateTimeDisplay: originalMatchDateTimeDisplay,
    fromDate,
    toDate,
    ...buildEditPartialsData(session, locale, sort),
  };

  // The sort radio GETs this route with `#edit-grid` as the swap target, so an
  // HTMX request gets the grid fragment; a plain request gets the full page.
  const html = app.isPartial
               ? renderEditGridPartial(app, props)
               : app.render(<EditPage {...props}/>);

  return app.html(html);
};
