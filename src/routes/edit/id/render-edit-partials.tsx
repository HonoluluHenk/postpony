import type { App } from '../../../app';
import type { AppLocale } from '../../../locales';
import type { Postponement, ProposedDate, VoteTallyItem } from '../../../lib/models';
import { PostponementRules, sortedProposedDates, type VoteTally } from '../../../lib/postponement';
import { formatProposedDateDisplay, formatProposedDateDisplayShort } from '../../../lib/temporal-utils';
import { buildOwnTeamView } from './own-team-view';
import { EditPage, type EditPageProps } from './edit';
import type { DateSort, EditGridProps, EditPartialsData } from './proposed-dates-section';

function toVoteTallyItems(
  proposedDates: ProposedDate[],
  tallies: Record<string, VoteTally>,
  locale: AppLocale,
): VoteTallyItem[] {
  return proposedDates.map((pd) => {
    const counts = tallies[pd.id] ?? {yes: 0, no: 0, ifNecessary: 0};
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
export function buildEditPartialsData(session: Postponement, locale: AppLocale, sort: DateSort = 'date'): EditPartialsData {
  const rules = new PostponementRules();
  const tallies = rules.tally(session);
  const homeTallies = rules.tally(session, 'home');
  const awayTallies = rules.tally(session, 'away');
  const dates = sortedProposedDates(session.proposedDates);

  const proposedDates: EditPartialsData['proposedDates'] = dates.map((pd) => {
    const counts = tallies[pd.id] ?? {yes: 0, no: 0, ifNecessary: 0};
    return {
      id: pd.id,
      dateTimeRange: pd.dateTimeRange,
      display: formatProposedDateDisplay(pd.dateTimeRange.start, locale),
      shortDisplay: formatProposedDateDisplayShort(pd.dateTimeRange.start, locale),
      votable: pd.votable,
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
    proposedDates,
    homeProposedDates: toVoteTallyItems(dates, homeTallies, locale),
    awayProposedDates: toVoteTallyItems(dates, awayTallies, locale),
    clashCheckable: session.homeTeamIdentity !== undefined && session.guestTeamIdentity !== undefined,
    venues: session.venues,
    ...buildOwnTeamView(session, locale),
  };
}

/** Fields carried by `EditGridProps` (or the page) rather than the data builder. */
type EditViewField = 't' | 'locale' | 'inputFormat' | 'baseUrl';
type EditDataField = keyof EditPartialsData;

/**
 * What a mutation may override when re-rendering the edit page: every
 * `EditGridProps` field that is neither view context nor data-builder output,
 * plus the page-level `globalError`. Derived by exclusion, so a new form/error
 * field is declared once on `EditGridProps` and lands here automatically.
 */
export type EditPartialExtras = Pick<
  EditGridProps,
  Exclude<keyof EditGridProps, EditViewField | EditDataField>
> & Pick<EditPageProps, 'globalError'>;

/**
 * The rail's sort lives in the page URL, so a mutation (which posts to a URL
 * without it) recovers it from the browser's current URL that HTMX forwards.
 */
function currentSort(app: App): 'date' | 'availability' {
  const currentUrl = app.c.req.header('HX-Current-URL');
  if (!currentUrl) {
    return 'date';
  }
  try {
    return new URL(currentUrl).searchParams.get('sort') === 'availability' ? 'availability' : 'date';
  } catch {
    return 'date';
  }
}

/**
 * Renders the redesigned edit page as an HTMX partial (isPartial → fragment). The page
 * re-renders in full so the sidebar and rail stay in sync after any mutation; the
 * out-of-band error container and status announcement are emitted by the layout.
 */
export function renderEditPartials(
  app: App,
  session: Postponement,
  extra: EditPartialExtras = {},
): string {
  const data = buildEditPartialsData(session, app.locale, currentSort(app));
  const props: EditPageProps = {
    ...app.view,
    ...data,
    ...extra,
    session,
    title: app.t('edit_postponement_title', {name: session.name}),
  };
  return app.render(<EditPage {...props} />);
}
