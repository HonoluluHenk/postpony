import { DateTimeRange } from './temporal-utils';

// ponytail: placeholder until multi-tenancy (ADR-0001) is implemented;
// replace with real club resolution (from URL domain, user session, etc.).
export const DEFAULT_CLUB_ID = 'default-club';

export type RescheduleStatus = 'Draft' | 'Proposed' | 'Voting' | 'Confirmed by Opponent' | 'Confirmed';

export interface Player {
  id: string;
  name: string;
  teamId: 'home' | 'away';
}

export interface AvailabilityRecord {
  participantId: string;
  ranges: DateTimeRange[];
}

export interface RescheduleSession {
  id: string;
  clubId: string;
  name: string;
  ownerPasswordHash: string;
  invitationPasswordHash: string;
  invitationPassword: string;
  status: RescheduleStatus;
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
  awayTeamVotable: boolean;
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
