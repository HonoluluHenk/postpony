import type { App, ViewContext } from '../../../app';
import type { AppLocale } from '../../../locales';
import type { Postponement, ProposedDate, VoteTallyItem } from '../../../lib/models';
import { PostponementRules, sortedProposedDates, type VoteTally } from '../../../lib/postponement';
import { formatProposedDateDisplay, formatProposedDateDisplayShort } from '../../../lib/temporal-utils';
import { buildOwnTeamView } from './own-team-view';
import { EditGrid, EditPage, type EditPageProps } from './edit';
import { organizerPasswordFromRequest } from './edit-auth';
import { ErrorContainer } from '../../partials/error-container';
import { StatusAnnouncement } from '../../partials/status-announcement';
import { currentSortParam, type DateSort } from '../../partials/sort-control';
import type { EditGridProps, EditPartialsData } from './proposed-dates-section';

function toVoteTallyItems(
  proposedDates: ProposedDate[],
  tallies: Record<string, VoteTally>,
  locale: AppLocale,
): VoteTallyItem[] {
  return proposedDates.map((pd) => {
    // ponytail: tallies derive from these same proposedDates, so the lookup is
    // guaranteed; a cast keeps a dead default branch out.
    const counts = tallies[pd.id] as VoteTally;
    return {
      id: pd.id,
      display: formatProposedDateDisplay(pd.dateTimeRange.start, locale),
      yes: counts.yes,
      no: counts.no,
      ifNecessary: counts.ifNecessary,
    };
  });
}

/**
 * Shared shape for the edit page and the HTMX partials: the session-derived display
 * fields, the proposed-date list items (with the votable flag and ISO range), the
 * per-team tallies, and the organizer-team completion view. Used by edit-id-get and
 * every post handler that re-renders the page.
 */
export function buildEditPartialsData(
  session: Postponement,
  locale: AppLocale,
  sort: DateSort = 'date',
): EditPartialsData {
  const rules = new PostponementRules();
  const tallies = rules.tally(session);
  const homeTallies = rules.tally(session, 'home');
  const awayTallies = rules.tally(session, 'away');
  const dates = sortedProposedDates(session.proposedDates);

  const proposedDates: EditPartialsData['proposedDates'] = dates.map((pd) => {
    // ponytail: tallies derive from these same proposedDates, so the lookup is
    // guaranteed; a cast keeps a dead default branch out.
    const counts = tallies[pd.id] as VoteTally;
    return {
      id: pd.id,
      dateTimeRange: pd.dateTimeRange,
      display: formatProposedDateDisplay(pd.dateTimeRange.start, locale),
      shortDisplay: formatProposedDateDisplayShort(pd.dateTimeRange.start, locale),
      votable: pd.votable,
      accepted: pd.accepted,
      yes: counts.yes,
      no: counts.no,
      ifNecessary: counts.ifNecessary,
      clashes: pd.clashes,
      venueNumber: pd.venueNumber,
      venueOccupancy: pd.venueOccupancy,
    };
  });

  return {
    sessionId: session.id,
    status: session.status,
    reopenCount: session.reopenCount,
    organizerTeam: session.organizerTeam,
    homeTeam: session.homeTeam,
    guestTeam: session.guestTeam,
    sort,
    availabilityBands: rules.availabilityRanking(session, session.organizerTeam)
      .map((group) => ({kind: group.kind, ids: group.dates.map((date) => date.id)})),
    proposedDates,
    homeProposedDates: toVoteTallyItems(dates, homeTallies, locale),
    awayProposedDates: toVoteTallyItems(dates, awayTallies, locale),
    clashCheckable: session.homeTeamIdentity !== undefined && session.guestTeamIdentity !== undefined,
    clashDataStale: session.clashDataStale === true,
    venues: session.venues,
    ...buildOwnTeamView(session, locale),
  };
}

/**
 * What a mutation may override when re-rendering the edit grid: every
 * `EditGridProps` field that is neither view context nor data-builder output,
 * plus the page-level `globalError`. Derived by exclusion, so a new form/error
 * field is declared once on `EditGridProps` and lands here automatically.
 */
export type EditPartialExtras = Pick<
  EditGridProps,
  Exclude<keyof EditGridProps, keyof ViewContext | keyof EditPartialsData>
> & Pick<EditPageProps, 'globalError'>;

/**
 * The `#edit-grid` swap target as a standalone HTMX fragment, plus the
 * out-of-band error container and status announcement. The OOB elements live
 * outside the grid, so replacing the grid never destroys their targets.
 */
export function renderEditGridPartial(app: App, props: EditPageProps): string {
  return app.render(
    <>
      <ErrorContainer globalError={props.globalError} isOob={true}/>
      <StatusAnnouncement message={props.statusMessage} isOob={true}/>
      <EditGrid {...props}/>
    </>,
  );
}

/**
 * Renders a mutation result: the full page for a plain request, the
 * `#edit-grid` fragment for an HTMX one so the swap target matches the
 * response root.
 */
export function renderEditPartials(
  app: App,
  session: Postponement,
  extra: EditPartialExtras = {},
): string {
  const data = buildEditPartialsData(session, app.locale, currentSortParam(app));
  const props: EditPageProps = {
    ...app.view,
    ...data,
    ...extra,
    session,
    title: app.t('edit_postponement_title', {name: session.name}),
    organizerPassword: organizerPasswordFromRequest(app),
  };
  if (!app.isPartial) {
    return app.render(<EditPage {...props} />);
  }
  return renderEditGridPartial(app, props);
}
