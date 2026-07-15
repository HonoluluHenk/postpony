import type { App } from '../../../app';
import { formatLocalizedDateTime, parseIsoToPlainDateTime } from '../../../lib/temporal-utils';
import { toIntlLocale } from '../../../locales';

export const handleEditGet = (app: App): Response => {
  const id = app.requireParam('id');
  const session = app.sessions[id];
  if (!session) {
    app.notFound(app.t('session_not_found'));
  }

  const ownerPassword = app.c.req.query('ownerPassword') ?? null;
  const isPartial = app.isPartial;
  const proposedDates = session.proposedDates.map((pd) => ({
    id: pd.id,
    display: formatLocalizedDateTime(parseIsoToPlainDateTime(pd.dateTimeRange.start), toIntlLocale(app.locale)),
  }));
  const html = app.render('edit/id/edit.eta', {
    title: app.t('edit_reschedule_title', {name: session.name}),
    session,
    proposedDates,
    ownerPassword,
    isPartial,
  });

  return app.c.html(html);
};
