import type { App } from '../../app';
import type { AppLocale } from '../../locales';
import type { Clash } from '../../lib/clashes';
import type { Postponement } from '../../lib/models';
import { PostponementRules, type VoteTally } from '../../lib/postponement';
import { formatProposedDateDisplay } from '../../lib/temporal-utils';
import { opponentPasswordFromRequest, opponentTeam } from './opponent-utils';
import { OpponentPage, type OpponentPageProps, type OpponentViewData } from './opponent';

/**
 * Shapes the opponent-captain scope from the session: the opponent team name and roster,
 * and per votable date the opponent team's tally plus the vetoed/acceptable flags.
 * Each date also carries its ISO range (for the four-part date cell) and only the
 * opponent side's own clash lines — undefined when never checked (no clash UI),
 * empty when checked clean. The organizer side's lines never reach the template.
 */
export function buildOpponentViewData(session: Postponement, locale: AppLocale): OpponentViewData {
  const rules = new PostponementRules();
  const team = opponentTeam(session);
  const tallies = rules.tally(session, team);
  const opponentTeamName = team === 'home' ? (session.homeTeam ?? '') : (session.guestTeam ?? '');

  const dates = rules.votableDates(session).map((pd) => {
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
      vetoed: pd.vetoed,
      acceptable: pd.acceptable,
      yes: counts.yes,
      no: counts.no,
      ifNecessary: counts.ifNecessary,
    };
  });

  return {
    opponentTeamName,
    players: session.players.filter((p) => p.teamId === team),
    dates,
  };
}

/**
 * Renders the opponent page (full or HTMX partial) with the scoped view data and
 * any mutation extras. Mirrors `renderEditPartials` for the opponent surface.
 */
export function renderOpponent(
  app: App,
  session: Postponement,
  extra: Partial<Pick<OpponentPageProps, 'playerName' | 'playerError' | 'statusMessage' | 'globalError'>> = {},
): string {
  const props: OpponentPageProps = {
    ...app.view,
    ...buildOpponentViewData(session, app.locale),
    ...extra,
    session,
    title: app.t('opponent_title'),
    opponentCaptainPassword: opponentPasswordFromRequest(app),
  };
  return app.render(<OpponentPage {...props} />);
}
