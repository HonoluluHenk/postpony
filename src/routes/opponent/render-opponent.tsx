import type { App } from '../../app';
import type { AppLocale } from '../../locales';
import type { Clash } from '../../lib/clashes';
import type { Postponement } from '../../lib/models';
import { PostponementRules, type VoteTally } from '../../lib/postponement';
import { formatProposedDateDisplay } from '../../lib/temporal-utils';
import { opponentPasswordFromRequest, opponentTeam } from './opponent-utils';
import { OpponentPage, OpponentView, type OpponentPageProps, type OpponentViewData } from './opponent';
import { ErrorContainer } from '../partials/error-container';
import { StatusAnnouncement } from '../partials/status-announcement';
import { currentSortParam, type DateSort } from '../partials/sort-control';

/**
 * Shapes the opponent-captain scope from the session: the opponent team name and roster,
 * and per votable date the opponent team's tally plus the opponent-votable/accepted flags.
 * Each date also carries its ISO range (for the four-part date cell) and only the
 * opponent side's own clash lines — undefined when never checked (no clash UI),
 * empty when checked clean. The organizer side's lines never reach the template.
 */
export function buildOpponentViewData(
  session: Postponement,
  locale: AppLocale,
  sort: DateSort = 'date',
): OpponentViewData {
  const rules = new PostponementRules();
  const team = opponentTeam(session);
  const tallies = rules.tally(session, team);
  const opponentTeamName = team === 'home' ? (session.homeTeam ?? '') : (session.guestTeam ?? '');

  const dates = rules.votableDates(session)
    .map((pd) => {
      // ponytail: tallies derive from these same proposedDates, so the lookup is
      // guaranteed; a cast keeps a dead default branch out.
      const counts = tallies[pd.id] as VoteTally;
      const ownClashes: Clash[] | undefined = pd.clashes === undefined
                                              ? undefined
                                              : (team === 'home' ? pd.clashes.home : pd.clashes.away);
      return {
        id: pd.id,
        display: formatProposedDateDisplay(pd.dateTimeRange.start, locale),
        dateTimeRange: pd.dateTimeRange,
        ownClashes,
        opponentVotable: pd.opponentVotable,
        accepted: pd.accepted,
        yes: counts.yes,
        no: counts.no,
        ifNecessary: counts.ifNecessary,
      };
    });

  return {
    opponentTeamName,
    players: session.players.filter((p) => p.teamId === team),
    dates,
    sort,
    refreshCheckable: (team === 'home' ? session.homeTeamIdentity : session.guestTeamIdentity) !== undefined,
  };
}

/**
 * Renders the opponent view as an HTMX partial: the swap target's own element
 * (`#opponent-view`) plus the out-of-band error container and status
 * announcement. The OOB elements live outside the view, so replacing it never
 * destroys their targets.
 */
export function renderOpponent(
  app: App,
  session: Postponement,
  extra: Partial<Pick<OpponentPageProps, 'playerName' | 'playerError' | 'statusMessage' | 'refreshError' | 'globalError'>> = {},
): string {
  const props: OpponentPageProps = {
    ...app.view,
    ...buildOpponentViewData(session, app.locale, currentSortParam(app)),
    ...extra,
    session,
    title: app.t('opponent_title'),
    opponentCaptainPassword: opponentPasswordFromRequest(app),
  };
  // A plain (non-HTMX) request still gets the full page; only the HTMX partial
  // is scoped to the view so the swap target matches the response root.
  if (!app.isPartial) {
    return app.render(<OpponentPage {...props} />);
  }
  return app.render(
    <>
      <ErrorContainer globalError={extra.globalError} isOob={true}/>
      <StatusAnnouncement message={extra.statusMessage} isOob={true}/>
      <OpponentView {...props}/>
    </>,
  );
}
