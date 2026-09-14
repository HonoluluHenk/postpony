import { Temporal } from '@js-temporal/polyfill';
import type { Match } from './click-tt-scraper';
import type { Postponement, ProposedDate } from './models';
import { PostponementRules } from './postponement';
import { parseClickTtDateTime, parseIsoToPlainDateTime } from './temporal-utils';
import type { VenueOccupancyByProposedDate } from './venue-occupancy';

/**
 * The Clash domain module: pure decision logic for schedule clash checks on
 * proposed dates. No I/O — handlers scrape both teams' schedules and pass the
 * rows in.
 */
export const CLASH_BUFFER_HOURS = 2;

export interface Clash {
  opponent: string;
  start: string; // ISO-normalized via parseClickTtDateTime
}

export interface OriginalMatchIdentity {
  start?: string;   // ISO datetime of the postponed match
  homeTeam?: string;
  guestTeam?: string;
}

export interface DateClashes {
  home: Clash[];
  away: Clash[];
}

export type ClashesByProposedDate = Record<string, DateClashes>;

/** The full pure result of a clash check: every Proposed Date's Clashes plus the home club's Venue Occupancy when that scrape succeeded. */
export interface ClashCheckResult {
  clashes: ClashesByProposedDate;
  venueOccupancy?: VenueOccupancyByProposedDate;
}

export interface BufferedWindow {
  lower: Temporal.PlainDateTime;
  upper: Temporal.PlainDateTime;
}

/** A scraped Match whose start falls inside a Proposed Date's buffered window. */
export interface WindowedGame {
  match: Match;
  start: string;
}

/**
 * The `[proposedStart − CLASH_BUFFER_HOURS, proposedEnd + CLASH_BUFFER_HOURS]`
 * window around a Proposed Date's range, inclusive at the edges. Shared by the
 * clash and venue-occupancy checks so both signals use the same edges.
 */
export function bufferedWindow(dateTimeRange: ProposedDate['dateTimeRange']): BufferedWindow {
  return {
    lower: parseIsoToPlainDateTime(dateTimeRange.start)
      .subtract({hours: CLASH_BUFFER_HOURS}),
    upper: parseIsoToPlainDateTime(dateTimeRange.end)
      .add({hours: CLASH_BUFFER_HOURS}),
  };
}

/**
 * The shared buffered-window scan: the scraped games whose start falls inside
 * `[proposedStart − CLASH_BUFFER_HOURS, proposedEnd + CLASH_BUFFER_HOURS]`,
 * inclusive at the edges, each paired with its ISO-normalized start. A game with
 * no parsable date/time is skipped. Used by both the clash and venue-occupancy
 * checks so the window edges never drift between them.
 */
export function gamesInBufferedWindow(
  dateTimeRange: ProposedDate['dateTimeRange'],
  games: readonly Match[],
): WindowedGame[] {
  const {lower, upper} = bufferedWindow(dateTimeRange);

  const windowed: WindowedGame[] = [];
  for (const game of games) {
    const start = parseClickTtDateTime(game.date, game.time);
    if (!start) {
      continue;
    }
    const startTime = parseIsoToPlainDateTime(start);
    if (Temporal.PlainDateTime.compare(startTime, lower) < 0
        || Temporal.PlainDateTime.compare(startTime, upper) > 0) {
      continue;
    }
    windowed.push({match: game, start});
  }
  return windowed;
}

/**
 * Computes the Clashes of every Proposed Date against both teams' scraped
 * schedules, keyed by Proposed Date id. A game clashes when its start falls
 * within `[proposedStart - CLASH_BUFFER_HOURS, proposedEnd + CLASH_BUFFER_HOURS]`,
 * inclusive at the edges. The postponed match (same date plus home/guest names)
 * is excluded from both schedules before evaluation. A game listed on both team
 * pages appears on both sides; a hand-entered match (no identity) excludes
 * nothing.
 */
export function computeClashes(
  proposedDates: ProposedDate[],
  homeSchedule: Match[],
  awaySchedule: Match[],
  originalMatch: OriginalMatchIdentity = {},
): ClashesByProposedDate {
  const homeGames = homeSchedule.filter((game) => !isOriginalMatch(game, originalMatch));
  const awayGames = awaySchedule.filter((game) => !isOriginalMatch(game, originalMatch));

  const result: ClashesByProposedDate = {};
  for (const proposedDate of proposedDates) {
    result[proposedDate.id] = {
      home: clashesInRange(proposedDate.dateTimeRange, homeGames, originalMatch.homeTeam),
      away: clashesInRange(proposedDate.dateTimeRange, awayGames, originalMatch.guestTeam),
    };
  }
  return result;
}

function clashesInRange(
  dateTimeRange: ProposedDate['dateTimeRange'],
  games: Match[],
  sideName: string | undefined,
): Clash[] {
  return gamesInBufferedWindow(dateTimeRange, games)
    .map(({match, start}) => ({opponent: opponentOf(match, sideName), start}));
}

/**
 * True when a Proposed Date carries at least one Clash on either side. Missing
 * clash data (never checked, or the scrape failed) is not a clash.
 */
export function isDateClashing(clashes: DateClashes | undefined): boolean {
  return clashes !== undefined && (clashes.home.length > 0 || clashes.away.length > 0);
}

/**
 * The pure session rule applied after a clash check: attaches each Proposed
 * Date's clash and venue-occupancy snapshot, and flips the ids named by
 * `autoDeselectIds` that clash to `votable: false` (a clashing newly added date
 * must not enter either poll unnoticed). Pre-existing ids not named are left
 * untouched, respecting any manual override; the manual refresh passes no ids.
 */
export function applyClashCheckResult(
  session: Postponement,
  result: ClashCheckResult,
  autoDeselectIds: readonly string[] = [],
): Postponement {
  const autoDeselect = new Set(autoDeselectIds);
  const attached: Postponement = {
    ...session,
    proposedDates: session.proposedDates.map((pd) => ({
      ...pd,
      clashes: result.clashes[pd.id],
      venueOccupancy: result.venueOccupancy?.[pd.id],
    })),
  };

  const rules = new PostponementRules();
  let updated = attached;
  for (const pd of attached.proposedDates) {
    if (autoDeselect.has(pd.id) && isDateClashing(pd.clashes)) {
      updated = rules.setVotable(updated, pd.id, false);
    }
  }
  return updated;
}

/**
 * True when the game is the postponed match itself (same date plus home and
 * guest names); a hand-entered match (no identity) matches nothing.
 */
export function isOriginalMatch(game: Match, originalMatch: OriginalMatchIdentity): boolean {
  if (originalMatch.start === undefined
      || originalMatch.homeTeam === undefined
      || originalMatch.guestTeam === undefined) {
    return false;
  }
  const start = parseClickTtDateTime(game.date, game.time);
  return start?.slice(0, 10) === originalMatch.start.slice(0, 10)
    && game.homeTeam === originalMatch.homeTeam
    && game.guestTeam === originalMatch.guestTeam;
}

function opponentOf(game: Match, sideName: string | undefined): string {
  // ponytail: click-tt lists the actual home team first, so a game can show the
  // affected team as guest ("Bern vs Thun" on Thun's page); the opponent is the
  // other side. Without the team name (hand-entered match) fall back to the
  // guest/home extraction from the ticket.
  return sideName !== undefined && game.homeTeam !== sideName
    ? game.homeTeam
    : game.guestTeam;
}
