import type { App } from '../../../app';
import type { AppLocale } from '../../../locales';
import type { Postponement, ProposedDate, VoteTallyItem } from '../../../lib/models';
import { PostponementRules, sortedProposedDates, type VoteTally } from '../../../lib/postponement';
import { formatProposedDateDisplay } from '../../../lib/temporal-utils';
import { buildOwnTeamView } from './own-team-view';
import {
  ProposedDatesSectionPartial,
  type EditPartialsData,
  type ProposedDatesSectionPartialProps,
} from './proposed-dates-section';

function toVoteTallyItems(
  proposedDates: ProposedDate[],
  tallies: Record<string, VoteTally>,
  locale: AppLocale,
): VoteTallyItem[] {
  return proposedDates.map((pd) => {
    const counts = tallies[pd.id] ?? {yes: 0, no: 0, maybe: 0};
    return {
      id: pd.id,
      display: formatProposedDateDisplay(pd.dateTimeRange.start, locale),
      yes: counts.yes,
      no: counts.no,
      maybe: counts.maybe,
    };
  });
}

/**
 * Shared shape for the edit page and the HTMX partials: the proposed-date list items
 * (with the votable flag), the per-team tallies, and the organizer-team completion
 * view. Used by edit-id-get and every post handler that re-renders the partial set.
 */
export function buildEditPartialsData(session: Postponement, locale: AppLocale): EditPartialsData {
  const rules = new PostponementRules();
  const tallies = rules.tally(session);
  const homeTallies = rules.tally(session, 'home');
  const awayTallies = rules.tally(session, 'away');
  const dates = sortedProposedDates(session.proposedDates);

  const proposedDates: EditPartialsData['proposedDates'] = dates.map((pd) => {
    const counts = tallies[pd.id] ?? {yes: 0, no: 0, maybe: 0};
    return {
      id: pd.id,
      display: formatProposedDateDisplay(pd.dateTimeRange.start, locale),
      votable: pd.votable,
      yes: counts.yes,
      no: counts.no,
      maybe: counts.maybe,
      clashes: pd.clashes,
      venueNumber: pd.venueNumber,
      venueOccupancy: pd.venueOccupancy,
    };
  });

  return {
    proposedDates,
    homeProposedDates: toVoteTallyItems(dates, homeTallies, locale),
    awayProposedDates: toVoteTallyItems(dates, awayTallies, locale),
    clashCheckable: session.homeTeamIdentity !== undefined && session.guestTeamIdentity !== undefined,
    venues: session.venues,
    ...buildOwnTeamView(session, locale),
  };
}

export interface EditPartialExtras {
  proposedDateTime?: string;
  error?: string;
  globalError?: string;
  success?: boolean;
  times?: readonly string[];
  generatorInvalidRow?: number;
  generatorError?: string;
  generatorSuccessCount?: number;
  generatorFromError?: string;
  generatorToError?: string;
  refreshError?: boolean;
  confirmClashWarning?: boolean;
  fromDate?: string;
  toDate?: string;
}

/**
 * Renders the proposed-dates section partial plus its OOB companions (status chip, vote
 * tally, own-team votes, error container). The partial set is shared by the proposed-dates,
 * visibility, confirm, and reopen post handlers so the edit view stays in sync after any of
 * those mutations.
 */
export function renderEditPartials(
  app: App,
  session: Postponement,
  extra: EditPartialExtras = {},
): string {
  const view = app.view;
  const data = buildEditPartialsData(session, app.locale);
  const props: ProposedDatesSectionPartialProps = {
    ...data,
    sessionId: session.id,
    status: session.status,
    reopenCount: session.reopenCount,
    t: view.t,
    locale: view.locale,
    inputFormat: view.inputFormat,
    venues: data.venues,
    proposedDateTime: extra.proposedDateTime,
    error: extra.error,
    success: extra.success,
    times: extra.times,
    generatorInvalidRow: extra.generatorInvalidRow,
    generatorError: extra.generatorError,
    generatorSuccessCount: extra.generatorSuccessCount,
    generatorFromError: extra.generatorFromError,
    generatorToError: extra.generatorToError,
    refreshError: extra.refreshError,
    confirmClashWarning: extra.confirmClashWarning,
    globalError: extra.globalError,
    fromDate: extra.fromDate,
    toDate: extra.toDate,
  };
  return app.render(<ProposedDatesSectionPartial {...props} />);
}
