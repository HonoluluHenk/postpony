import type { App } from '../../../app';
import { Reschedule } from '../../../lib/reschedule';
import { formatLocalizedDateTime, parseIsoToPlainDateTime } from '../../../lib/temporal-utils';
import { toIntlLocale } from '../../../locales';

export const handleProposedDateVisibilityPost = async (app: App): Promise<Response> => {
  const id = app.requireParam('id');
  const session = await app.store.get(id);
  if (!session) {
    app.notFound(app.t('session_not_found'));
  }

  const proposedDateId = app.c.req.query('proposedDateId') ?? '';
  const votable = app.c.req.query('votable') === 'true';

  const reschedule = new Reschedule();
  const updated = reschedule.setAwayTeamVotable(session, proposedDateId, votable);
  await app.store.save(updated);

  const locale = toIntlLocale(app.locale);
  const tallies = reschedule.tally(updated);
  const homeTallies = reschedule.tally(updated, 'home');
  const awayTallies = reschedule.tally(updated, 'away');

  const proposedDates = updated.proposedDates.map((pd) => {
    const counts = tallies[pd.id] ?? {yes: 0, no: 0, maybe: 0};
    return {
      id: pd.id,
      display: formatLocalizedDateTime(parseIsoToPlainDateTime(pd.dateTimeRange.start), locale),
      awayTeamVotable: pd.awayTeamVotable,
      yes: counts.yes,
      no: counts.no,
      maybe: counts.maybe,
    };
  });

  const homeProposedDates = updated.proposedDates.map((pd) => {
    const counts = homeTallies[pd.id] ?? {yes: 0, no: 0, maybe: 0};
    return {
      id: pd.id,
      display: formatLocalizedDateTime(parseIsoToPlainDateTime(pd.dateTimeRange.start), locale),
      yes: counts.yes,
      no: counts.no,
      maybe: counts.maybe,
    };
  });

  const awayProposedDates = updated.proposedDates.map((pd) => {
    const counts = awayTallies[pd.id] ?? {yes: 0, no: 0, maybe: 0};
    return {
      id: pd.id,
      display: formatLocalizedDateTime(parseIsoToPlainDateTime(pd.dateTimeRange.start), locale),
      yes: counts.yes,
      no: counts.no,
      maybe: counts.maybe,
    };
  });

  const html = app.render('edit/id/proposed-dates-section.eta', {
    sessionId: updated.id,
    proposedDates,
    homeProposedDates,
    awayProposedDates,
  });

  return app.c.html(html);
};
