import { describe, expect, test } from 'vitest';
import { aPlayer, aProposedDate, aSession, aVote } from './__test-utils__/builders';
import { Reschedule } from './reschedule';

/**
 * Deterministic Reschedule for assertions: overrides the `newId` and `now` seams so ids
 * and timestamps are predictable in tests.
 */
class FakeReschedule extends Reschedule {
  private n = 0;

  override newId(): string {
    return `id-${++this.n}`;
  }

  override now(): string {
    return '2025-01-01T00:00:00.000Z';
  }
}

describe('reschedule', () => {

  describe('addPlayer', () => {
    test('defaults to home team', () => {
      const before = aSession();
      const {session, player} = new FakeReschedule().addPlayer(before, 'Alice');

      expect(player)
        .toEqual({id: 'id-1', name: 'Alice', teamId: 'home'});
      expect(session.players)
        .toEqual([player]);
    });

    test('adds an away-team player when specified', () => {
      const before = aSession();
      const {session, player} = new FakeReschedule().addPlayer(before, 'Bob', 'away');

      expect(player)
        .toEqual({id: 'id-1', name: 'Bob', teamId: 'away'});
      expect(session.players)
        .toEqual([player]);
    });

    test('does not mutate the input session', () => {
      const before = aSession();
      new FakeReschedule().addPlayer(before, 'Alice');

      expect(before.players)
        .toHaveLength(0);
    });
  });

  describe('registerParticipant', () => {
    test('creates a new player for the team', () => {
      const {session, player} = new FakeReschedule().registerParticipant(aSession(), 'away', {name: 'Alice'});

      expect(player?.teamId)
        .toBe('away');
      expect(session.players)
        .toHaveLength(1);
    });

    test('matches an existing player by name case-insensitively without duplicating', () => {
      const before = aSession({players: [aPlayer({id: 'away-1', name: 'Bob', teamId: 'away'})]});

      const {session, player} = new FakeReschedule().registerParticipant(before, 'away', {name: 'bob'});

      expect(player)
        .toBe(before.players[0]);
      expect(session.players)
        .toHaveLength(1);
    });

    test('matches an existing player by id', () => {
      const before = aSession({players: [aPlayer({id: 'home-1', name: 'Carol', teamId: 'home'})]});

      const {player} = new FakeReschedule().registerParticipant(before, 'home', {playerId: 'home-1'});

      expect(player)
        .toBe(before.players[0]);
    });

    test('returns no player when neither a name nor a selection is given', () => {
      const {player} = new FakeReschedule().registerParticipant(aSession(), 'home', {});

      expect(player)
        .toBeUndefined();
    });

    test('returns no player when the selected id is on another team', () => {
      const before = aSession({players: [aPlayer({id: 'home-1', teamId: 'home'})]});

      const {player} = new FakeReschedule().registerParticipant(before, 'away', {playerId: 'home-1'});

      expect(player)
        .toBeUndefined();
    });
  });

  describe('proposeDate', () => {
    test('adds a proposed date with matching start and end', () => {
      const {session, proposedDate} = new FakeReschedule().proposeDate(aSession(), '2025-09-01T20:00', 'owner');

      expect(proposedDate.dateTimeRange.start)
        .toBe(proposedDate.dateTimeRange.end);
      expect(proposedDate.proposerId)
        .toBe('owner');
      expect(session.proposedDates)
        .toEqual([proposedDate]);
    });
  });

  describe('castVote', () => {
    test('records a new vote', () => {
      const before = aSession({proposedDates: [aProposedDate()]});

      const session = new FakeReschedule().castVote(before, 'proposed-date-1', 'player-1', 'Yes');

      expect(session.votes)
        .toHaveLength(1);
      expect(session.votes[0])
        .toMatchObject({proposedDateId: 'proposed-date-1', participantId: 'player-1', type: 'Yes'});
    });

    test('updates an existing vote instead of duplicating it', () => {
      const before = aSession({
        votes: [aVote({proposedDateId: 'proposed-date-1', participantId: 'player-1', type: 'Yes'})],
      });

      const session = new FakeReschedule().castVote(before, 'proposed-date-1', 'player-1', 'No');

      expect(session.votes)
        .toHaveLength(1);
      expect(session.votes[0]?.type)
        .toBe('No');
    });

    test('updates one vote while leaving other participants untouched', () => {
      const before = aSession({
        votes: [
          aVote({id: 'v1', proposedDateId: 'pd-1', participantId: 'a', type: 'Yes'}),
          aVote({id: 'v2', proposedDateId: 'pd-1', participantId: 'b', type: 'Yes'}),
        ],
      });

      const session = new FakeReschedule().castVote(before, 'pd-1', 'a', 'No');

      expect(session.votes)
        .toHaveLength(2);
      expect(session.votes.find((v) => v.participantId === 'a')?.type)
        .toBe('No');
      expect(session.votes.find((v) => v.participantId === 'b')?.type)
        .toBe('Yes');
    });

    test('does not mutate the input session votes', () => {
      const before = aSession({
        votes: [aVote({proposedDateId: 'proposed-date-1', participantId: 'player-1', type: 'Yes'})],
      });

      new FakeReschedule().castVote(before, 'proposed-date-1', 'player-1', 'No');

      expect(before.votes[0]?.type)
        .toBe('Yes');
    });
  });

  describe('tally', () => {
    test('aggregates votes per proposed date', () => {
      const session = aSession({
        proposedDates: [aProposedDate({id: 'pd-1'})],
        votes: [
          aVote({id: 'v1', proposedDateId: 'pd-1', participantId: 'a', type: 'Yes'}),
          aVote({id: 'v2', proposedDateId: 'pd-1', participantId: 'b', type: 'Yes'}),
          aVote({id: 'v3', proposedDateId: 'pd-1', participantId: 'c', type: 'No'}),
          aVote({id: 'v4', proposedDateId: 'pd-1', participantId: 'd', type: 'Maybe'}),
        ],
      });

      expect(new FakeReschedule().tally(session)['pd-1'])
        .toEqual({yes: 2, no: 1, maybe: 1});
    });

    test('filters votes by home team', () => {
      const session = aSession({
        players: [
          aPlayer({id: 'home-1', teamId: 'home'}),
          aPlayer({id: 'away-1', teamId: 'away'}),
        ],
        proposedDates: [aProposedDate({id: 'pd-1'})],
        votes: [
          aVote({proposedDateId: 'pd-1', participantId: 'home-1', type: 'Yes'}),
          aVote({proposedDateId: 'pd-1', participantId: 'away-1', type: 'No'}),
        ],
      });

      expect(new FakeReschedule().tally(session, 'home')['pd-1'])
        .toEqual({yes: 1, no: 0, maybe: 0});
    });

    test('filters votes by away team', () => {
      const session = aSession({
        players: [
          aPlayer({id: 'home-1', teamId: 'home'}),
          aPlayer({id: 'away-1', teamId: 'away'}),
        ],
        proposedDates: [aProposedDate({id: 'pd-1'})],
        votes: [
          aVote({proposedDateId: 'pd-1', participantId: 'home-1', type: 'Yes'}),
          aVote({proposedDateId: 'pd-1', participantId: 'away-1', type: 'No'}),
        ],
      });

      expect(new FakeReschedule().tally(session, 'away')['pd-1'])
        .toEqual({yes: 0, no: 1, maybe: 0});
    });

    test('returns all votes when no team filter is passed', () => {
      const session = aSession({
        players: [
          aPlayer({id: 'home-1', teamId: 'home'}),
          aPlayer({id: 'away-1', teamId: 'away'}),
        ],
        proposedDates: [aProposedDate({id: 'pd-1'})],
        votes: [
          aVote({proposedDateId: 'pd-1', participantId: 'home-1', type: 'Yes'}),
          aVote({proposedDateId: 'pd-1', participantId: 'away-1', type: 'No'}),
        ],
      });

      expect(new FakeReschedule().tally(session)['pd-1'])
        .toEqual({yes: 1, no: 1, maybe: 0});
    });
  });

  describe('splitTallies', () => {
    test('returns per-team tallies', () => {
      const session = aSession({
        players: [
          aPlayer({id: 'home-1', teamId: 'home'}),
          aPlayer({id: 'away-1', teamId: 'away'}),
        ],
        proposedDates: [aProposedDate({id: 'pd-1'})],
        votes: [
          aVote({proposedDateId: 'pd-1', participantId: 'home-1', type: 'Yes'}),
          aVote({proposedDateId: 'pd-1', participantId: 'away-1', type: 'No'}),
        ],
      });

      const {home, away} = new FakeReschedule().splitTallies(session);

      expect(home['pd-1'])
        .toEqual({yes: 1, no: 0, maybe: 0});
      expect(away['pd-1'])
        .toEqual({yes: 0, no: 1, maybe: 0});
    });
  });

  describe('setAwayTeamVotable', () => {
    test('sets awayTeamVotable on a proposed date', () => {
      const session = aSession({
        proposedDates: [aProposedDate({id: 'pd-1', awayTeamVotable: false})],
      });

      const updated = new FakeReschedule().setAwayTeamVotable(session, 'pd-1', true);

      expect(updated.proposedDates[0]?.awayTeamVotable)
        .toBe(true);
    });

    test('clears awayTeamVotable on a proposed date', () => {
      const session = aSession({
        proposedDates: [aProposedDate({id: 'pd-1', awayTeamVotable: true})],
      });

      const updated = new FakeReschedule().setAwayTeamVotable(session, 'pd-1', false);

      expect(updated.proposedDates[0]?.awayTeamVotable)
        .toBe(false);
    });

    test('does not mutate the input session', () => {
      const session = aSession({
        proposedDates: [aProposedDate({id: 'pd-1', awayTeamVotable: false})],
      });

      new FakeReschedule().setAwayTeamVotable(session, 'pd-1', true);

      expect(session.proposedDates[0]?.awayTeamVotable)
        .toBe(false);
    });
  });

  describe('default seams', () => {
    test('produce distinct ids and an ISO timestamp', () => {
      const reschedule = new Reschedule();

      expect(reschedule.newId())
        .not
        .toBe(reschedule.newId());
      expect(reschedule.now())
        .toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

});
