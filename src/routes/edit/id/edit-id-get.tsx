import type { App } from '../../../app';
import { formatIsoToLocaleTokens, nowPlainDateTimeIso } from '../../../lib/temporal-utils';
import { Temporal } from '@js-temporal/polyfill';
import { EditPage } from './edit';
import { buildEditPartialsData } from './render-edit-partials';

export const handleEditGet = async (app: App): Promise<Response> => {
  const id = app.requireParam('id');
  const session = await app.store.get(id);
  if (!session) {
    app.notFound(app.t('session_not_found'));
  }

  const ownerPassword = app.c.req.query('ownerPassword') ?? null;
  const locale = app.locale;

  const originalMatchDateTime = session.originalMatchDateTime
    ? formatIsoToLocaleTokens(session.originalMatchDateTime, locale)
    : '';

  const todayDate = Temporal.PlainDate.from(nowPlainDateTimeIso());
  const defaultFromDate = todayDate.toString();
  const defaultToDate = todayDate.add({weeks: 4}).toString();

  const html = app.render(
    <EditPage
      {...app.view}
      title={app.t('edit_postponement_title', {name: session.name})}
      session={session}
      ownerPassword={ownerPassword ?? undefined}
      proposedDateTime={originalMatchDateTime}
      fromDate={defaultFromDate}
      toDate={defaultToDate}
      {...buildEditPartialsData(session, locale)}
    />,
  );

  return app.c.html(html);
};
