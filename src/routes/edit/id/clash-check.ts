import { computeClashes, type ClashCheckResult } from '../../../lib/clashes';
import { fetchClubMeetings, fetchMatches, seasonWindow, type Match } from '../../../lib/click-tt-scraper';
import { DEFAULT_CLUB_ID, type Postponement } from '../../../lib/models';
import { computeVenueOccupancy } from '../../../lib/venue-occupancy';

async function fetchHomeClubMeetings(session: Postponement): Promise<Match[] | undefined> {
  if (session.clubId === DEFAULT_CLUB_ID) {
    return undefined;
  }
  const championship = session.homeTeamIdentity?.championship;
  const window = championship !== undefined ? seasonWindow(championship) : undefined;
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
      fetchHomeClubMeetings(session).catch(() => undefined),
    ]);
    const originalMatch = {
      start: session.originalMatchDateTime,
      homeTeam: session.homeTeam,
      guestTeam: session.guestTeam,
    };
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
