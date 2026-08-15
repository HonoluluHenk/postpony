import { describe, expect, test } from 'vitest';
import { aPlayer, aProposedDate, aSession, aVote } from './builders';

describe('builders', () => {

  describe('aPlayer', () => {
    test('returns a fully-populated player by default', () => {
      expect(aPlayer())
        .toEqual({
          id: 'player-1',
          name: 'Test Player',
          teamId: 'home',
        });
    });

    test('applies partial overrides', () => {
      const player = aPlayer({id: 'player-2', name: 'Bob'});
      expect(player.id)
        .toBe('player-2');
      expect(player.name)
        .toBe('Bob');
      expect(player.teamId)
        .toBe('home');
    });
  });

  describe('aProposedDate', () => {
    test('returns a fully-populated proposed date by default', () => {
      expect(aProposedDate())
        .toEqual({
          id: 'proposed-date-1',
          sessionId: 'test-session',
          dateTimeRange: {
            start: '2025-09-01T20:00:00',
            end: '2025-09-01T22:00:00',
          },
          proposerId: 'player-1',
          votableByOpponent: false,
        });
    });

    test('deep-merges nested dateTimeRange overrides', () => {
      const proposedDate = aProposedDate({dateTimeRange: {start: '2025-10-01T18:00:00'}});
      expect(proposedDate.dateTimeRange.start)
        .toBe('2025-10-01T18:00:00');
      expect(proposedDate.dateTimeRange.end)
        .toBe('2025-09-01T22:00:00');
    });
  });

  describe('aVote', () => {
    test('returns a fully-populated vote by default', () => {
      expect(aVote())
        .toEqual({
          id: 'vote-1',
          proposedDateId: 'proposed-date-1',
          participantId: 'player-1',
          type: 'Yes',
        });
    });

    test('applies literal-union overrides', () => {
      expect(aVote({type: 'Maybe'}).type)
        .toBe('Maybe');
    });
  });

  describe('aSession', () => {
    test('returns a fully-populated session with every required field', () => {
      expect(aSession())
        .toEqual({
          id: 'test-session',
          clubId: 'test-club',
          name: 'Test Postponement',
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
        });
    });

    test('overrides only the given field, keeping other defaults', () => {
      const session = aSession({status: 'Voting'});
      expect(session.status)
        .toBe('Voting');
      expect(session.id)
        .toBe('test-session');
      expect(session.clubId)
        .toBe('test-club');
    });

    test('composes nested entities', () => {
      const session = aSession({
        players: [aPlayer(), aPlayer({id: 'player-2'})],
        proposedDates: [aProposedDate()],
      });
      expect(session.players)
        .toHaveLength(2);
      expect(session.players[1]?.id)
        .toBe('player-2');
      expect(session.proposedDates)
        .toHaveLength(1);
    });
  });

});
