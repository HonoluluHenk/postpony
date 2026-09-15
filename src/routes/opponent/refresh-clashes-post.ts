import type { App } from '../../app';
import { computeOwnSideCheck } from '../../lib/clash-check';
import { mergeOwnSideClashes } from '../../lib/clashes';
import { opponentTeam } from './opponent-utils';
import { runOpponentCommand } from './run-opponent-command';

/**
 * The opponent captain's schedule re-check: scrapes only the opponent side's
 * schedule and merges the fresh lines into the shared snapshot, preserving
 * the organizer side's stored lines byte-identical and never touching the
 * symmetric votable switch. Venue Occupancy is replaced only when the home
 * side's re-fetch succeeds; otherwise the previous snapshot is preserved. A
 * failed check saves nothing: the previous snapshot keeps rendering with the
 * refresh-failed warning, or the plain nothing state when no snapshot exists.
 */
export const handleOpponentRefreshPost = (app: App): Promise<Response> => {
  let refreshed = false;
  let hadSnapshot = false;

  return runOpponentCommand(app, {
    apply: async (_rules, session) => {
      const side = opponentTeam(session);
      // Only claim "showing the previous results" when a previous snapshot
      // actually exists; a first check that fails renders the plain nothing state.
      hadSnapshot = session.proposedDates.some((pd) => pd.clashes !== undefined);
      const result = await computeOwnSideCheck(session, side);
      if (result === undefined) {
        return session;
      }
      refreshed = true;
      const merged = mergeOwnSideClashes(session, side, result.schedule);
      const occupancy = result.venueOccupancy;
      if (occupancy === undefined) {
        return merged;
      }
      return {
        ...merged,
        proposedDates: merged.proposedDates.map((pd) => ({
          ...pd,
          venueOccupancy: occupancy[pd.id] ?? pd.venueOccupancy,
        })),
      };
    },
    message: () => refreshed ? app.t('clash_check_refreshed') : undefined,
    extras: () => (!refreshed && hadSnapshot ? {refreshError: true} : {}),
  });
};
