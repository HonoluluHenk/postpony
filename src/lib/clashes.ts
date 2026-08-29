import { Temporal } from '@js-temporal/polyfill';
import type { Match } from './click-tt-scraper';
import type { ProposedDate } from './models';
import { parseClickTtDateTime, parseIsoToPlainDateTime } from './temporal-utils';

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
  const lower = parseIsoToPlainDateTime(dateTimeRange.start)
    .subtract({hours: CLASH_BUFFER_HOURS});
  const upper = parseIsoToPlainDateTime(dateTimeRange.end)
    .add({hours: CLASH_BUFFER_HOURS});

  const clashes: Clash[] = [];
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
    clashes.push({opponent: opponentOf(game, sideName), start});
  }
  return clashes;
}

function isOriginalMatch(game: Match, originalMatch: OriginalMatchIdentity): boolean {
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
