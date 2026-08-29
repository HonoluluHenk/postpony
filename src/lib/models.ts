import { DateTimeRange } from './temporal-utils';

// ponytail: placeholder until multi-tenancy (ADR-0001) is implemented;
// replace with real club resolution (from URL domain, user session, etc.).
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
  ownerPasswordHash: string;
  invitationPasswordHash: string;
  invitationPassword: string;
  status: PostponementStatus;
  organizerTeam: Team;
  reopenCount: number;
  confirmedProposedDateId?: string;
  players: Player[];
  proposedDates: ProposedDate[];
  votes: Vote[];
  originalMatchDateTime?: string; // format YYYY-MM-DDTHH:mm, ISO storage form
  metadata?: Record<string, unknown>;
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
  votableByOpponent: boolean;
}

export interface Vote {
  id: string;
  proposedDateId: string;
  participantId: string;
  type: 'Yes' | 'No' | 'Maybe';
}

export interface VoteTallyItem {
  id: string;
  display: string;
  yes: number;
  no: number;
  maybe: number;
}
