import type { App } from '../../../app';
import type { VoteTallyItem } from '../../../lib/models';
import { PostponementRules } from '../../../lib/postponement';
import { formatIsoToLocaleTokens, formatLocalizedDateTime, parseIsoToPlainDateTime } from '../../../lib/temporal-utils';

export const handleEditGet = async (app: App): Promise<Response> => {
  const id = app.requireParam('id');
  const session = await app.store.get(id);
  if (!session) {
    app.notFound(app.t('session_not_found'));
  }

  const ownerPassword = app.c.req.query('ownerPassword') ?? null;
  const isPartial = app.isPartial;
  const locale = app.locale;
  const rules = new PostponementRules();
  const tallies = rules.tally(session);
  const homeTallies = rules.tally(session, 'home');
  const awayTallies = rules.tally(session, 'away');

  const proposedDates: (VoteTallyItem & {
    votableByOpponent: boolean
  })[] = session.proposedDates.map((pd) => {
    const counts = tallies[pd.id] ?? {yes: 0, no: 0, maybe: 0};
    return {
      id: pd.id,
      display: formatLocalizedDateTime(parseIsoToPlainDateTime(pd.dateTimeRange.start), locale),
      votableByOpponent: pd.votableByOpponent,
      yes: counts.yes,
      no: counts.no,
      maybe: counts.maybe,
    };
  });

  const homeProposedDates: VoteTallyItem[] = session.proposedDates.map((pd) => {
    const counts = homeTallies[pd.id] ?? {yes: 0, no: 0, maybe: 0};
    return {
      id: pd.id,
      display: formatLocalizedDateTime(parseIsoToPlainDateTime(pd.dateTimeRange.start), locale),
      yes: counts.yes,
      no: counts.no,
      maybe: counts.maybe,
    };
  });

  const awayProposedDates: VoteTallyItem[] = session.proposedDates.map((pd) => {
    const counts = awayTallies[pd.id] ?? {yes: 0, no: 0, maybe: 0};
    return {
      id: pd.id,
      display: formatLocalizedDateTime(parseIsoToPlainDateTime(pd.dateTimeRange.start), locale),
      yes: counts.yes,
      no: counts.no,
      maybe: counts.maybe,
    };
  });

  const html = app.render('edit/id/edit.eta', {
    title: app.t('edit_postponement_title', {name: session.name}),
    session,
    proposedDates,
    homeProposedDates,
    awayProposedDates,
    proposedDateTime: session.originalMatchDateTime
                      ? formatIsoToLocaleTokens(session.originalMatchDateTime, locale)
                      : '',
    ownerPassword,
    invitationPassword: session.invitationPassword,
    isPartial,
  });

  return app.c.html(html);
};
