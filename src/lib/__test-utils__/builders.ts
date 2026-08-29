import merge from 'lodash-es/merge';
import type { Player, Postponement, ProposedDate, Vote } from '../models';

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
    votableByOpponent: false,
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

export function aSession(overrides: DeepPartial<Postponement> = {}): Postponement {
  // ponytail: cast needed because DeepPartial of nested objects (e.g.
  // ClickTtTeamIdentity) is not assignable to the full type; the merge output
  // is trusted as the overrides are already typed.
  return merge({
    id: 'test-session',
    clubId: 'test-club',
    name: 'Test Postponement',
    homeTeam: 'Home Team',
    guestTeam: 'Guest Team',
    ownerPasswordHash: 'hashed-owner-pw',
    invitationPasswordHash: 'hashed-invitation-pw',
    invitationPassword: 'invitation-pw',
    status: 'Draft',
    organizerTeam: 'home',
    reopenCount: 0,
    players: [],
    proposedDates: [],
    votes: [],
    createdAt: '2025-01-01T00:00:00.000Z',
  }, overrides) as Postponement;
}
