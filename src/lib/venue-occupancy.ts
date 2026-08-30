import { Temporal } from '@js-temporal/polyfill';
import { bufferedWindow, isOriginalMatch } from './clashes';
import type { Clash, OriginalMatchIdentity } from './clashes';
import type { Match } from './click-tt-scraper';
import type { ProposedDate } from './models';
import { parseClickTtDateTime, parseIsoToPlainDateTime } from './temporal-utils';

/**
 * The Venue Occupancy domain module: pure counting logic for hall-occupancy
 * checks on proposed dates. No I/O — handlers scrape the home club's home
 * meetings and pass the rows in. A home Match occupies the date's venue when
 * its `venueNumber` matches the date's venue (default 1) and its start falls
 * within `[proposedStart − CLASH_BUFFER_HOURS, proposedEnd + CLASH_BUFFER_HOURS]`,
 * the same window as clash checks. The postponed Match is excluded and
 * venue-less Matches are skipped (never guessed as venue 1).
 */
export interface VenueOccupancy {
  count: number;
  matches: Clash[];
}

export type VenueOccupancyByProposedDate = Record<string, VenueOccupancy>;

export function computeVenueOccupancy(
  proposedDates: ProposedDate[],
  homeMatches: Match[],
  originalMatch: OriginalMatchIdentity = {},
): VenueOccupancyByProposedDate {
  const games = homeMatches.filter((game) => !isOriginalMatch(game, originalMatch));

  const result: VenueOccupancyByProposedDate = {};
  for (const proposedDate of proposedDates) {
    const venue = proposedDate.venueNumber ?? 1;
    const {lower, upper} = bufferedWindow(proposedDate.dateTimeRange);

    const matches: Clash[] = [];
    for (const game of games) {
      if (game.venueNumber === undefined || game.venueNumber !== venue) {
        continue;
      }
      const start = parseClickTtDateTime(game.date, game.time);
      if (!start) {
        continue;
      }
      const startTime = parseIsoToPlainDateTime(start);
      if (Temporal.PlainDateTime.compare(startTime, lower) < 0
          || Temporal.PlainDateTime.compare(startTime, upper) > 0) {
        continue;
      }
      matches.push({opponent: game.guestTeam, start});
    }
    result[proposedDate.id] = {count: matches.length, matches};
  }
  return result;
}