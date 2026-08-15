import type { App } from '../../../app';
import type { AppLocale } from '../../../locales';
import type { Postponement, ProposedDate, VoteTallyItem } from '../../../lib/models';
import { PostponementRules, type VoteTally } from '../../../lib/postponement';
import { formatLocalizedDateTime, parseIsoToPlainDateTime } from '../../../lib/temporal-utils';
import { buildOwnTeamView, type OwnTeamView } from './own-team-view';

export interface ProposedDateTallyItem extends VoteTallyItem {
  votableByOpponent: boolean;
}

export type EditPartialsData = OwnTeamView & {
  proposedDates: ProposedDateTallyItem[];
  homeProposedDates: VoteTallyItem[];
  awayProposedDates: VoteTallyItem[];
};

function toVoteTallyItems(
  proposedDates: ProposedDate[],
  tallies: Record<string, VoteTally>,
  locale: AppLocale,
): VoteTallyItem[] {
  return proposedDates.map((pd) => {
    const counts = tallies[pd.id] ?? {yes: 0, no: 0, maybe: 0};
    return {
      id: pd.id,
      display: formatLocalizedDateTime(parseIsoToPlainDateTime(pd.dateTimeRange.start), locale),
      yes: counts.yes,
      no: counts.no,
      maybe: counts.maybe,
    };
  });
}

/**
 * Shared shape for the edit page and the HTMX partials: the proposed-date list items
 * (with the opponent-vote flag), the per-team tallies, and the organizer-team completion
 * view. Used by edit-id-get and every post handler that re-renders the partial set.
 */
export function buildEditPartialsData(session: Postponement, locale: AppLocale): EditPartialsData {
  const rules = new PostponementRules();
  const tallies = rules.tally(session);
  const homeTallies = rules.tally(session, 'home');
  const awayTallies = rules.tally(session, 'away');

  const proposedDates: ProposedDateTallyItem[] = session.proposedDates.map((pd) => {
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

  return {
    proposedDates,
    homeProposedDates: toVoteTallyItems(session.proposedDates, homeTallies, locale),
    awayProposedDates: toVoteTallyItems(session.proposedDates, awayTallies, locale),
    ...buildOwnTeamView(session, locale),
  };
}

/**
 * Renders the proposed-dates section partial plus its OOB companions (vote tally, own-team
 * votes). The partial set is shared by the proposed-dates, visibility, confirm, and reopen
 * post handlers so the edit view stays in sync after any of those mutations.
 */
export function renderEditPartials(
  app: App,
  session: Postponement,
  extra: Record<string, unknown> = {},
): string {
  return app.render('edit/id/proposed-dates-section.eta', {
    sessionId: session.id,
    status: session.status,
    reopenCount: session.reopenCount,
    ...buildEditPartialsData(session, app.locale),
    ...extra,
  });
}