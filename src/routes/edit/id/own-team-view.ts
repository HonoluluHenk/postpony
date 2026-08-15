import type { AppLocale } from '../../../locales';
import type { Player, Postponement } from '../../../lib/models';
import { PostponementRules, type OwnTeamDateResults } from '../../../lib/postponement';
import { formatLocalizedDateTime, parseIsoToPlainDateTime } from '../../../lib/temporal-utils';

export interface OwnTeamView {
  organizerPlayers: Player[];
  ownTeamResults: (OwnTeamDateResults & { display: string })[];
}

/**
 * Shapes the organizer-team completion data for the edit view: the roster players in
 * roster order (the table's player columns) and, per proposed date, the per-player
 * votes plus the "N/M voted" count and non-voter list, each date carrying a localized
 * display string.
 */
export function buildOwnTeamView(session: Postponement, locale: AppLocale): OwnTeamView {
  const rules = new PostponementRules();
  const organizerPlayers = session.players.filter((p) => p.teamId === session.organizerTeam);
  const displayByDateId = new Map(
    session.proposedDates.map((pd) => [
      pd.id,
      formatLocalizedDateTime(parseIsoToPlainDateTime(pd.dateTimeRange.start), locale),
    ]),
  );
  const ownTeamResults = rules.ownTeamResults(session, session.organizerTeam).map((result) => ({
    ...result,
    display: displayByDateId.get(result.dateId) ?? '',
  }));
  return {organizerPlayers, ownTeamResults};
}