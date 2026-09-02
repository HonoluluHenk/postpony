import type { App } from '../../../app';
import { formatIsoToDateOnlyLocaleTokens, formatIsoToLocaleTokens, nowPlainDateTimeIso } from '../../../lib/temporal-utils';
import { Temporal } from '@js-temporal/polyfill';
import { MAX_FORWARD_WEEKS_FROM_ORIGINAL } from '../../../lib/proposed-dates-generator';
import { EditPage } from './edit';
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

  const todayDate = Temporal.PlainDate.from(nowPlainDateTimeIso());
  const defaultFromDate = formatIsoToDateOnlyLocaleTokens(todayDate.toString(), locale);
  const defaultToDateRaw = session.originalMatchDateTime !== undefined
    ? Temporal.PlainDate.from(session.originalMatchDateTime).add({weeks: MAX_FORWARD_WEEKS_FROM_ORIGINAL})
    : todayDate.add({weeks: MAX_FORWARD_WEEKS_FROM_ORIGINAL});
  const defaultToDate = formatIsoToDateOnlyLocaleTokens(defaultToDateRaw.toString(), locale);

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
      fromDate={defaultFromDate}
      toDate={defaultToDate}
      {...buildEditPartialsData(session, locale)}
    />,
  );

  return app.c.html(html);
};
