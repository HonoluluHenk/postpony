import type { DateClashes } from './clashes';
import { DateTimeRange } from './temporal-utils';
import type { VenueOccupancy } from './venue-occupancy';

// ponytail: single-club by design (multi-tenancy withdrawn, ADR-0001);
// club_id is retained as a forward-compatible column only.
export const DEFAULT_CLUB_ID = 'default-club';

export type Team = 'home' | 'away';

export type PostponementStatus = 'Draft' | 'Voting' | 'Confirmed';

/** click-tt identity of a team; the scraper addresses teams by this triple (ADR-0022). */
export interface ClickTtTeamIdentity {
  championship: string;
  group: string;
  teamtable: string;
}

export interface Player {
  id: string;
  name: string;
  teamId: Team;
}

/** A hall a postponed Match could be played in, scraped from the click-tt club page and snapshotted onto the Postponement at creation. */
export interface Venue {
  venueNumber: number;
  name: string;
  /** Short display name for dropdowns, e.g. "Turnhalle orange". Computed from `name` at creation. */
  shortName: string;
  address: string;
  postalCode: string;
  city: string;
}

export interface AvailabilityRecord {
  participantId: string;
  ranges: DateTimeRange[];
}

export interface Postponement {
  id: string;
  clubId: string;
  name: string;
  homeTeam?: string;
  guestTeam?: string;
  homeTeamIdentity?: ClickTtTeamIdentity;
  guestTeamIdentity?: ClickTtTeamIdentity;
  organizerCaptainPasswordHash: string;
  opponentCaptainPasswordHash: string;
  homePlayerPasswordHash: string;
  awayPlayerPasswordHash: string;
  opponentCaptainPassword: string;
  homePlayerPassword: string;
  awayPlayerPassword: string;
  status: PostponementStatus;
  organizerTeam: Team;
  reopenCount: number;
  confirmedProposedDateId?: string;
  /** True when the last schedule check failed transiently, so dates saved around then may lack fresh clash data. Cleared by the next successful check. */
  clashDataStale?: boolean;
  players: Player[];
  venues: Venue[];
  proposedDates: ProposedDate[];
  votes: Vote[];
  originalMatchDateTime?: string; // format YYYY-MM-DDTHH:mm, ISO storage form
  createdAt: string;
}

export interface ProposedDate {
  id: string;
  sessionId: string;
  dateTimeRange: {
    start: string; // ISO string
    end: string;   // ISO string
  };
  proposerId: string;
  /** venue number this date applies to; absent means venue 1 (legacy dates predate venues). */
  venueNumber?: number;
  /** whether either team may vote on this date; closed dates are hidden from all polls and cannot be confirmed. */
  votable: boolean;
  /** whether the opponent team may vote on this date; only settable on votable dates. Off hides the date from the opponent team's poll and blocks confirmation. */
  opponentVotable: boolean;
  /** whether the opponent captain accepted this date; a date must be accepted to be confirmed. */
  accepted: boolean;
  /** per-team schedule Clashes from the last check that ran on this date; absent when never checked or the scrape failed. */
  clashes?: DateClashes;
  /** Venue Occupancy snapshot from the last check; absent when never checked, the occupancy scrape failed, or the session has no club id. */
  venueOccupancy?: VenueOccupancy;
}

export interface Vote {
  id: string;
  proposedDateId: string;
  participantId: string;
  type: 'Yes' | 'No' | 'IfNecessary';
}

export interface VoteTallyItem {
  id: string;
  display: string;
  yes: number;
  no: number;
  ifNecessary: number;
}
