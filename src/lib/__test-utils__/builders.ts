import merge from 'lodash-es/merge';
import type { Player, ProposedDate, RescheduleSession, Venue, Vote } from '../models';

/**
 * Deep-partial so nested objects (e.g. `dateTimeRange`) can be overridden field-by-field,
 * matching the deep-merge behaviour of `merge`.
 */
type DeepPartial<T> =
  T extends (infer U)[] ? DeepPartial<U>[] :
  T extends object ? { [P in keyof T]?: DeepPartial<T[P]> } :
  T;

export function aPlayer(overrides: DeepPartial<Player> = {}): Player {
  return merge({
    id: 'player-1',
    name: 'Test Player',
    teamId: 'home',
  }, overrides);
}

export function aProposedDate(overrides: DeepPartial<ProposedDate> = {}): ProposedDate {
  return merge({
    id: 'proposed-date-1',
    sessionId: 'test-session',
    dateTimeRange: {
      start: '2025-09-01T20:00:00',
      end: '2025-09-01T22:00:00',
    },
    proposerId: 'player-1',
    awayTeamVotable: false,
  }, overrides);
}

export function aVote(overrides: DeepPartial<Vote> = {}): Vote {
  return merge({
    id: 'vote-1',
    proposedDateId: 'proposed-date-1',
    participantId: 'player-1',
    type: 'Yes',
  }, overrides);
}

export function aVenue(overrides: DeepPartial<Venue> = {}): Venue {
  return merge({
    id: 'venue-1',
    clubId: 'test-club',
    name: 'Test Venue',
    availability: [],
    bookings: [],
  }, overrides);
}

export function aSession(overrides: DeepPartial<RescheduleSession> = {}): RescheduleSession {
  return merge({
    id: 'test-session',
    clubId: 'test-club',
    name: 'Test Reschedule',
    ownerPasswordHash: 'hashed-owner-pw',
    invitationPasswordHash: 'hashed-invitation-pw',
    invitationPassword: 'invitation-pw',
    status: 'Draft',
    players: [],
    proposedDates: [],
    votes: [],
    createdAt: '2025-01-01T00:00:00.000Z',
  }, overrides);
}
