import { computeClashes, type ClashCheckResult, type OriginalMatchIdentity } from './clashes';
import { fetchClubMeetings, fetchMatches, seasonWindow, type Match } from './click-tt-scraper';
import { DEFAULT_CLUB_ID, type ClickTtTeamIdentity, type Postponement, type Team } from './models';
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
 * Scrapes both teams' click-tt schedules once and computes the Clashes of every
 * Proposed Date in the session, plus the home club's Venue Occupancy in the same
 * parallel pass. Returns undefined when the session has no team identities
 * (hand-entered match) or when either team scrape fails — the caller then saves
 * the dates clash-free and the page renders without clash info. The occupancy
 * scrape degrades on its own: a missing/failed club scrape resolves to undefined
 * and only the occupancy line is absent; clashes and the save are unaffected.
 * Shared by the add paths and the manual refresh handler so one code path drives
 * both.
 */
export async function computeClashesForSession(session: Postponement): Promise<ClashCheckResult | undefined> {
  const homeIdentity = session.homeTeamIdentity;
  const guestIdentity = session.guestTeamIdentity;
  if (!homeIdentity || !guestIdentity) {
    return undefined;
  }
  try {
    const [homeSchedule, awaySchedule, homeMeetings] = await Promise.all([
      fetchMatches(homeIdentity.championship, homeIdentity.group, homeIdentity.teamtable),
      fetchMatches(guestIdentity.championship, guestIdentity.group, guestIdentity.teamtable),
      // ponytail: a failed or inapplicable occupancy scrape must never block the
      // clash snapshot — it resolves to undefined and the occupancy line stays
      // absent. Upgrade path: surface a distinct "occupancy not checked" hint
      // when the club id exists but its scrape failed.
      fetchHomeClubMeetings(session, homeIdentity).catch(() => undefined),
    ]);
    const originalMatch = originalMatchOf(session);
    return {
      clashes: computeClashes(
        session.proposedDates,
        homeSchedule,
        awaySchedule,
        originalMatch,
      ),
      venueOccupancy: homeMeetings === undefined
        ? undefined
        : computeVenueOccupancy(session.proposedDates, homeMeetings, originalMatch),
    };
  } catch {
    // ponytail: a failed scrape never blocks adding dates — the dates are saved
    // without clash data and render without clash lines. On manual refresh the
    // caller keeps the previous snapshot instead.
    return undefined;
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
      const homeMeetings = await fetchHomeClubMeetings(session, identity).catch(() => undefined);
      if (homeMeetings !== undefined) {
        venueOccupancy = computeVenueOccupancy(session.proposedDates, homeMeetings, originalMatchOf(session));
      }
    }
    return {schedule, venueOccupancy};
  } catch {
    return undefined;
  }
}
