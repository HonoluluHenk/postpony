import { computeClashes, type ClashCheckResult, type OriginalMatchIdentity } from './clashes';
import { fetchClubMeetings, fetchMatches, seasonWindow, type Match } from './click-tt-scraper';
import { DEFAULT_CLUB_ID, type ClickTtTeamIdentity, type Postponement, type Team } from './models';
import { transientScrapeErrorKey } from './scrape-errors';
import { computeVenueOccupancy, type VenueOccupancyByProposedDate } from './venue-occupancy';

function originalMatchOf(session: Pick<Postponement, 'originalMatchDateTime' | 'homeTeam' | 'guestTeam'>): OriginalMatchIdentity {
  return {
    start: session.originalMatchDateTime,
    homeTeam: session.homeTeam,
    guestTeam: session.guestTeam,
  };
}

async function fetchHomeClubMeetings(
  session: Pick<Postponement, 'clubId'>,
  homeIdentity: ClickTtTeamIdentity,
): Promise<Match[] | undefined> {
  if (session.clubId === DEFAULT_CLUB_ID) {
    return undefined;
  }
  const window = seasonWindow(homeIdentity.championship);
  if (window === undefined) {
    return undefined;
  }
  return fetchClubMeetings(session.clubId, window.from, window.to);
}

/**
 * The result of a schedule check attempt: `ok` carries the fresh snapshot,
 * `transient-failure` means a retryable scrape failure (click-tt error or host
 * unreachable) that the caller surfaces and marks `clashDataStale`, and
 * `unchanged` means there was nothing to check or the error was non-transient —
 * the caller keeps its current state.
 */
export type ClashCheckOutcome =
  | {
  state: 'ok';
  result: ClashCheckResult
}
  | {
  state: 'transient-failure'
}
  | {
  state: 'unchanged'
};

/**
 * Scrapes both teams' click-tt schedules once and computes the Clashes of every
 * Proposed Date in the session, plus the home club's Venue Occupancy in the same
 * parallel pass. Returns `unchanged` when the session has no team identities
 * (hand-entered match) or the error was non-transient — the caller then saves the
 * dates clash-free and the page renders without clash info. A transient scrape
 * failure returns `transient-failure` so the caller can mark the clash data stale
 * and offer a retry. The occupancy scrape degrades on its own: a missing/failed
 * club scrape resolves to undefined and only the occupancy line is absent;
 * clashes and the save are unaffected. Shared by the add paths and the manual
 * refresh handler so one code path drives both.
 */
export async function computeClashesForSession(session: Postponement): Promise<ClashCheckOutcome> {
  const homeIdentity = session.homeTeamIdentity;
  const guestIdentity = session.guestTeamIdentity;
  if (!homeIdentity || !guestIdentity) {
    return {state: 'unchanged'};
  }
  try {
    const [homeSchedule, awaySchedule, homeMeetings] = await Promise.all([
      fetchMatches(homeIdentity.championship, homeIdentity.group, homeIdentity.teamtable),
      fetchMatches(guestIdentity.championship, guestIdentity.group, guestIdentity.teamtable),
      // ponytail: a failed or inapplicable occupancy scrape must never block the
      // clash snapshot — it resolves to undefined and the occupancy line stays
      // absent. Upgrade path: surface a distinct "occupancy not checked" hint
      // when the club id exists but its scrape failed.
      fetchHomeClubMeetings(session, homeIdentity)
        .catch(() => undefined),
    ]);
    const originalMatch = originalMatchOf(session);
    return {
      state: 'ok',
      result: {
        clashes: computeClashes(
          session.proposedDates,
          homeSchedule,
          awaySchedule,
          originalMatch,
        ),
        venueOccupancy: homeMeetings === undefined
                        ? undefined
                        : computeVenueOccupancy(session.proposedDates, homeMeetings, originalMatch),
      },
    };
  } catch (err) {
    // ponytail: only transient scrape failures are surfaceable; anything else is a
    // likely programming error and keeps today's behaviour (dates save without
    // clash data, a manual refresh keeps the previous snapshot).
    return transientScrapeErrorKey(err) === undefined ? {state: 'unchanged'} : {state: 'transient-failure'};
  }
}

/** The fresh input for a single-side re-check: that side's schedule, plus the home club's Venue Occupancy when that side can compute it. */
export interface OwnSideCheckResult {
  schedule: Match[];
  venueOccupancy?: VenueOccupancyByProposedDate;
}

/**
 * Scrapes only the named side's click-tt schedule for an opponent-triggered
 * re-check; the caller merges it over the stored snapshot with
 * `mergeOwnSideClashes`, leaving the other side's lines untouched. Venue
 * Occupancy is re-fetched only for the home side (only it can compute hall
 * data); when that fetch fails while the team scrape succeeds, occupancy
 * resolves to undefined and the caller preserves the previous snapshot. The
 * away side never touches occupancy. Returns undefined when the side has no
 * team identity (hand-entered match) or its scrape fails — the caller then
 * keeps the previous snapshot and renders the refresh-failed warning.
 */
export async function computeOwnSideCheck(
  session: Postponement,
  side: Team,
): Promise<OwnSideCheckResult | undefined> {
  const identity = side === 'home' ? session.homeTeamIdentity : session.guestTeamIdentity;
  if (!identity) {
    return undefined;
  }
  try {
    const schedule = await fetchMatches(identity.championship, identity.group, identity.teamtable);
    let venueOccupancy: VenueOccupancyByProposedDate | undefined;
    if (side === 'home') {
      // ponytail: occupancy degrades on its own like the full check above — a
      // failed club scrape resolves to undefined and the previous occupancy
      // snapshot is preserved instead of wiped.
      const homeMeetings = await fetchHomeClubMeetings(session, identity)
        .catch(() => undefined);
      if (homeMeetings !== undefined) {
        venueOccupancy = computeVenueOccupancy(session.proposedDates, homeMeetings, originalMatchOf(session));
      }
    }
    return {schedule, venueOccupancy};
  } catch {
    return undefined;
  }
}
