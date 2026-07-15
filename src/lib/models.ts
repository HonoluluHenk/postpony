import { DateTimeRange } from './temporal-utils';

export type RescheduleStatus = 'Draft' | 'Proposed' | 'Voting' | 'Confirmed by Opponent' | 'Confirmed';

export interface Venue {
  id: string;
  clubId: string;
  name: string;
  location?: string;
  availability: DateTimeRange[];
  bookings: DateTimeRange[];
  maxOverlaps?: number;
}

export interface Player {
  id: string;
  name: string;
  teamId: string;
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
  status: RescheduleStatus;
  maxOverlaps?: number;
  venueId?: string;
  opponentVenueId?: string;
  players: Player[];
  proposedDates: ProposedDate[];
  originalMatchDateTime?: string; // format YYYY-MM-DDTHH:mm, matches <input type="datetime-local">
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
}

export interface Vote {
  id: string;
  proposedDateId: string;
  participantId: string;
  type: 'Yes' | 'No' | 'Maybe';
}
