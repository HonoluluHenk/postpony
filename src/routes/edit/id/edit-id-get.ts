import type { App } from '../../../app';
import type { VoteTallyItem } from '../../../lib/models';
import { Reschedule } from '../../../lib/reschedule';
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
  const locale = toIntlLocale(app.locale);
  const tallies = new Reschedule().tally(session);
  const proposedDates: VoteTallyItem[] = session.proposedDates.map((pd) => {
    const counts = tallies[pd.id] ?? {yes: 0, no: 0, maybe: 0};
    return {
      id: pd.id,
      display: formatLocalizedDateTime(parseIsoToPlainDateTime(pd.dateTimeRange.start), locale),
      yes: counts.yes,
      no: counts.no,
      maybe: counts.maybe,
    };
  });
  const html = app.render('edit/id/edit.eta', {
    title: app.t('edit_reschedule_title', {name: session.name}),
    session,
    proposedDates,
    ownerPassword,
    invitationPassword: session.invitationPassword,
    isPartial,
  });

  return app.c.html(html);
};
