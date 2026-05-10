export type RescheduleStatus = 'Draft' | 'Proposed' | 'Voting' | 'Confirmed by Opponent' | 'Confirmed';

export interface RescheduleSession {
  id: string;
  clubId: string;
  name: string;
  ownerPasswordHash: string;
  invitationPasswordHash: string;
  status: RescheduleStatus;
  maxOverlaps?: number;
  metadata?: Record<string, any>;
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
