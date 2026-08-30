import { describe, expect, test } from 'vitest';
import { aPlayer, aProposedDate, aSession, aVote } from './__test-utils__/builders';
import { derivePostponementName, PostponementRules } from './postponement';

/**
 * Deterministic PostponementRules for assertions: overrides the `newId` and `now` seams so ids
 * and timestamps are predictable in tests.
 */
class FakePostponementRules extends PostponementRules {
  private n = 0;

  override newId(): string {
    return `id-${++this.n}`;
  }

  override now(): string {
    return '2025-01-01T00:00:00.000Z';
  }
}

describe('postponement', () => {

  describe('derivePostponementName', () => {
    test('formats "Home vs Guest – date time" in de-CH locale tokens', () => {
      expect(derivePostponementName('Thun', 'Ostermundigen', '2026-08-29T16:00', 'de-CH'))
        .toBe('Thun vs Ostermundigen – 29.08.2026 16:00');
    });

    test('formats "Home vs Guest – date time" in en-US locale tokens', () => {
      expect(derivePostponementName('Thun', 'Ostermundigen', '2026-08-29T16:00', 'en-US'))
        .toBe('Thun vs Ostermundigen – 08/29/2026 04:00 pm');
    });

    test('omits the date part when the original match datetime is unknown', () => {
      expect(derivePostponementName('Thun', 'Ostermundigen', undefined, 'de-CH'))
        .toBe('Thun vs Ostermundigen');
    });
  });

  describe('addPlayer', () => {
    test('defaults to home team', () => {
      const before = aSession();
      const {session, player} = new FakePostponementRules().addPlayer(before, 'Alice');

      expect(player)
        .toEqual({id: 'id-1', name: 'Alice', teamId: 'home'});
      expect(session.players)
        .toEqual([player]);
    });

    test('adds an away-team player when specified', () => {
      const before = aSession();
      const {session, player} = new FakePostponementRules().addPlayer(before, 'Bob', 'away');

      expect(player)
        .toEqual({id: 'id-1', name: 'Bob', teamId: 'away'});
      expect(session.players)
        .toEqual([player]);
    });

    test('does not mutate the input session', () => {
      const before = aSession();
      new FakePostponementRules().addPlayer(before, 'Alice');

      expect(before.players)
        .toHaveLength(0);
    });
  });

  describe('registerParticipant', () => {
    test('creates a new player for the team', () => {
      const {session, player} = new FakePostponementRules().registerParticipant(aSession(), 'away', {name: 'Alice'});

      expect(player?.teamId)
        .toBe('away');
      expect(session.players)
        .toMatchObject([{id: 'id-1', name: 'Alice', teamId: 'away'}]);
    });

    test('matches an existing player by name case-insensitively without duplicating', () => {
      const before = aSession({players: [aPlayer({id: 'away-1', name: 'Bob', teamId: 'away'})]});

      const {session, player} = new FakePostponementRules().registerParticipant(before, 'away', {name: 'bob'});

      expect(player)
        .toBe(before.players[0]);
      expect(session.players)
        .toMatchObject([{id: 'away-1', name: 'Bob', teamId: 'away'}]);
    });

    test('matches an existing player by id', () => {
      const before = aSession({players: [aPlayer({id: 'home-1', name: 'Carol', teamId: 'home'})]});

      const {player} = new FakePostponementRules().registerParticipant(before, 'home', {playerId: 'home-1'});

      expect(player)
        .toBe(before.players[0]);
    });

    test('returns no player when neither a name nor a selection is given', () => {
      const {player} = new FakePostponementRules().registerParticipant(aSession(), 'home', {});

      expect(player)
        .toBeUndefined();
    });

    test('returns no player when the selected id is on another team', () => {
      const before = aSession({players: [aPlayer({id: 'home-1', teamId: 'home'})]});

      const {player} = new FakePostponementRules().registerParticipant(before, 'away', {playerId: 'home-1'});

      expect(player)
        .toBeUndefined();
    });
  });

  describe('proposeDate', () => {
    test('adds a proposed date with matching start and end, votable by default', () => {
      const {session, proposedDate} = new FakePostponementRules().proposeDate(aSession(), '2025-09-01T20:00', 'owner');

      expect(proposedDate.dateTimeRange.start)
        .toBe(proposedDate.dateTimeRange.end);
      expect(proposedDate.proposerId)
        .toBe('owner');
      expect(proposedDate.votable)
        .toBe(true);
      expect(session.status)
        .toBe('Voting');
      expect(session.proposedDates)
        .toEqual([proposedDate]);
    });

    test('moves a Draft session to Voting on the first add', () => {
      const {session} = new FakePostponementRules().proposeDate(aSession({status: 'Draft'}), '2025-09-01T20:00', 'owner');

      expect(session.status)
        .toBe('Voting');
    });

    test('keeps Voting on later adds', () => {
      const before = aSession({
        status: 'Voting',
        proposedDates: [aProposedDate()],
      });

      const {session, proposedDate} = new FakePostponementRules().proposeDate(before, '2025-09-02T20:00', 'owner');

      expect(session.status)
        .toBe('Voting');
      expect(session.proposedDates)
        .toEqual([before.proposedDates[0], proposedDate]);
    });
  });

  describe('castVote', () => {
    test('records a new vote', () => {
      const before = aSession({proposedDates: [aProposedDate()]});

      const session = new FakePostponementRules().castVote(before, 'proposed-date-1', 'player-1', 'Yes');

      expect(session.votes)
        .toMatchObject([{id: 'id-1', proposedDateId: 'proposed-date-1', participantId: 'player-1', type: 'Yes'}]);
    });

    test('updates an existing vote instead of duplicating it', () => {
      const before = aSession({
        votes: [aVote({proposedDateId: 'proposed-date-1', participantId: 'player-1', type: 'Yes'})],
      });

      const session = new FakePostponementRules().castVote(before, 'proposed-date-1', 'player-1', 'No');

      expect(session.votes)
        .toMatchObject([{id: 'vote-1', proposedDateId: 'proposed-date-1', participantId: 'player-1', type: 'No'}]);
    });

    test('updates one vote while leaving other participants untouched', () => {
      const before = aSession({
        votes: [
          aVote({id: 'v1', proposedDateId: 'pd-1', participantId: 'a', type: 'Yes'}),
          aVote({id: 'v2', proposedDateId: 'pd-1', participantId: 'b', type: 'Yes'}),
        ],
      });

      const session = new FakePostponementRules().castVote(before, 'pd-1', 'a', 'No');

      expect(session.votes)
        .toMatchObject([
          {id: 'v1', proposedDateId: 'pd-1', participantId: 'a', type: 'No'},
          {id: 'v2', proposedDateId: 'pd-1', participantId: 'b', type: 'Yes'},
        ]);
    });

    test('does not mutate the input session votes', () => {
      const before = aSession({
        votes: [aVote({proposedDateId: 'proposed-date-1', participantId: 'player-1', type: 'Yes'})],
      });

      new FakePostponementRules().castVote(before, 'proposed-date-1', 'player-1', 'No');

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

      expect(new FakePostponementRules().tally(session)['pd-1'])
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

      expect(new FakePostponementRules().tally(session, 'home')['pd-1'])
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

      expect(new FakePostponementRules().tally(session, 'away')['pd-1'])
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

      expect(new FakePostponementRules().tally(session)['pd-1'])
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

      const {home, away} = new FakePostponementRules().splitTallies(session);

      expect(home['pd-1'])
        .toEqual({yes: 1, no: 0, maybe: 0});
      expect(away['pd-1'])
        .toEqual({yes: 0, no: 1, maybe: 0});
    });
  });

  describe('setVotable', () => {
    test('opens a proposed date for voting', () => {
      const session = aSession({
        proposedDates: [aProposedDate({id: 'pd-1', votable: false})],
      });

      const updated = new FakePostponementRules().setVotable(session, 'pd-1', true);

      expect(updated.proposedDates[0]?.votable)
        .toBe(true);
    });

    test('closes a proposed date for voting', () => {
      const session = aSession({
        proposedDates: [aProposedDate({id: 'pd-1', votable: true})],
      });

      const updated = new FakePostponementRules().setVotable(session, 'pd-1', false);

      expect(updated.proposedDates[0]?.votable)
        .toBe(false);
    });

    test('does not mutate the input session', () => {
      const session = aSession({
        proposedDates: [aProposedDate({id: 'pd-1', votable: false})],
      });

      new FakePostponementRules().setVotable(session, 'pd-1', true);

      expect(session.proposedDates[0]?.votable)
        .toBe(false);
    });
  });

  describe('votableDates', () => {
    test('returns only the votable dates, in stored order', () => {
      const session = aSession({
        proposedDates: [
          aProposedDate({id: 'pd-1', votable: true}),
          aProposedDate({id: 'pd-2', votable: false}),
          aProposedDate({id: 'pd-3', votable: true}),
        ],
      });

      expect(new FakePostponementRules().votableDates(session).map((pd) => pd.id))
        .toEqual(['pd-1', 'pd-3']);
    });

    test('returns an empty list when no dates are votable', () => {
      const session = aSession({
        proposedDates: [
          aProposedDate({id: 'pd-1', votable: false}),
          aProposedDate({id: 'pd-2', votable: false}),
        ],
      });

      expect(new FakePostponementRules().votableDates(session))
        .toEqual([]);
    });
  });

  describe('confirmDate', () => {
    test('confirms a votable date and locks the session', () => {
      const session = aSession({
        status: 'Voting',
        proposedDates: [aProposedDate({id: 'pd-1', votable: true})],
      });

      const updated = new FakePostponementRules().confirmDate(session, 'pd-1');

      expect(updated.status)
        .toBe('Confirmed');
      expect(updated.confirmedProposedDateId)
        .toBe('pd-1');
    });

    test('is a no-op for a date that is not votable', () => {
      const session = aSession({
        status: 'Voting',
        proposedDates: [aProposedDate({id: 'pd-1', votable: false})],
      });

      const updated = new FakePostponementRules().confirmDate(session, 'pd-1');

      expect(updated)
        .toBe(session);
      expect(updated.status)
        .toBe('Voting');
      expect(updated.confirmedProposedDateId)
        .toBeUndefined();
    });

    test('is a no-op for an unknown date', () => {
      const session = aSession({status: 'Voting', proposedDates: [aProposedDate()]});

      const updated = new FakePostponementRules().confirmDate(session, 'ghost');

      expect(updated)
        .toBe(session);
    });

    test('is idempotent: confirming the same date twice keeps the same state', () => {
      const session = aSession({
        status: 'Voting',
        proposedDates: [aProposedDate({id: 'pd-1', votable: true})],
      });

      const first = new FakePostponementRules().confirmDate(session, 'pd-1');
      const second = new FakePostponementRules().confirmDate(first, 'pd-1');

      expect(second)
        .toEqual(first);
      expect(second.status)
        .toBe('Confirmed');
      expect(second.confirmedProposedDateId)
        .toBe('pd-1');
    });
  });

  describe('reopen', () => {
    test('returns to Voting, increments reopenCount, and keeps history, votes, and flags', () => {
      const session = aSession({
        status: 'Confirmed',
        reopenCount: 0,
        confirmedProposedDateId: 'pd-1',
        proposedDates: [
          aProposedDate({id: 'pd-1', votable: true}),
          aProposedDate({id: 'pd-2', votable: false}),
        ],
        votes: [aVote({proposedDateId: 'pd-1', participantId: 'player-1', type: 'Yes'})],
      });

      const updated = new FakePostponementRules().reopen(session);

      expect(updated.status)
        .toBe('Voting');
      expect(updated.reopenCount)
        .toBe(1);
      expect(updated.confirmedProposedDateId)
        .toBe('pd-1');
      expect(updated.proposedDates)
        .toEqual(session.proposedDates);
      expect(updated.votes)
        .toEqual(session.votes);
    });

    test('keeps the session in Voting when reopened twice', () => {
      const session = aSession({
        status: 'Confirmed',
        reopenCount: 1,
        confirmedProposedDateId: 'pd-1',
        proposedDates: [aProposedDate({id: 'pd-1', votable: true})],
      });

      const updated = new FakePostponementRules().reopen(session);

      expect(updated.status)
        .toBe('Voting');
      expect(updated.reopenCount)
        .toBe(2);
    });
  });

  describe('deleteProposedDate', () => {
    test('removes the date and cascade-deletes its votes, keeping other dates and votes', () => {
      const session = aSession({
        proposedDates: [
          aProposedDate({id: 'pd-1'}),
          aProposedDate({id: 'pd-2'}),
        ],
        votes: [
          aVote({proposedDateId: 'pd-1', participantId: 'player-1', type: 'Yes'}),
          aVote({proposedDateId: 'pd-1', participantId: 'player-2', type: 'No'}),
          aVote({proposedDateId: 'pd-2', participantId: 'player-1', type: 'Maybe'}),
        ],
      });

      const updated = new FakePostponementRules().deleteProposedDate(session, 'pd-1');

      expect(updated.proposedDates.map((pd) => pd.id))
        .toEqual(['pd-2']);
      expect(updated.votes)
        .toEqual([expect.objectContaining({proposedDateId: 'pd-2'})]);
    });

    test('is a no-op for an unknown date id', () => {
      const session = aSession({
        proposedDates: [aProposedDate({id: 'pd-1'})],
        votes: [aVote({proposedDateId: 'pd-1', participantId: 'player-1', type: 'Yes'})],
      });

      const updated = new FakePostponementRules().deleteProposedDate(session, 'ghost');

      expect(updated)
        .toEqual(session);
    });

    test('clears a dangling confirmedProposedDateId when the confirmed-history date is deleted', () => {
      const session = aSession({
        status: 'Voting',
        confirmedProposedDateId: 'pd-1',
        proposedDates: [aProposedDate({id: 'pd-1'})],
      });

      const updated = new FakePostponementRules().deleteProposedDate(session, 'pd-1');

      expect(updated.confirmedProposedDateId)
        .toBeUndefined();
    });

    test('leaves the status untouched when deleting the last proposed date', () => {
      const session = aSession({
        status: 'Voting',
        proposedDates: [aProposedDate({id: 'pd-1'})],
      });

      const updated = new FakePostponementRules().deleteProposedDate(session, 'pd-1');

      expect(updated.status)
        .toBe('Voting');
      expect(updated.proposedDates)
        .toHaveLength(0);
    });
  });

  describe('teamCompletion', () => {
    const homePlayers = [
      aPlayer({id: 'p1', name: 'Voter', teamId: 'home'}),
      aPlayer({id: 'p2', name: 'JoinedElsewhere', teamId: 'home'}),
      aPlayer({id: 'p3', name: 'RosterOnly', teamId: 'home'}),
    ];

    test('counts voted, uses all team players as denominator, and marks never-joined players', () => {
      const session = aSession({
        players: [
          ...homePlayers,
          aPlayer({id: 'a1', name: 'Away', teamId: 'away'}),
        ],
        proposedDates: [
          aProposedDate({id: 'pd-1'}),
          aProposedDate({id: 'pd-2'}),
        ],
        votes: [
          aVote({proposedDateId: 'pd-1', participantId: 'p1', type: 'Yes'}),
          aVote({proposedDateId: 'pd-2', participantId: 'p2', type: 'No'}),
          aVote({proposedDateId: 'pd-1', participantId: 'a1', type: 'Yes'}),
        ],
      });

      const completion = new FakePostponementRules().teamCompletion(session, 'home');

      expect(completion['pd-1'])
        .toEqual({
          voted: 1,
          total: 3,
          nonVoters: [
            {playerId: 'p2', playerName: 'JoinedElsewhere', joined: true},
            {playerId: 'p3', playerName: 'RosterOnly', joined: false},
          ],
        });
      expect(completion['pd-2'])
        .toEqual({
          voted: 1,
          total: 3,
          nonVoters: [
            {playerId: 'p1', playerName: 'Voter', joined: true},
            {playerId: 'p3', playerName: 'RosterOnly', joined: false},
          ],
        });
    });

    test('returns an empty result when the team has no proposed dates', () => {
      const session = aSession({players: homePlayers});

      const completion = new FakePostponementRules().teamCompletion(session, 'home');

      expect(completion)
        .toEqual({});
    });
  });

  describe('ownTeamResults', () => {
    const teamPlayers = [
      aPlayer({id: 'p1', name: 'Voter', teamId: 'home'}),
      aPlayer({id: 'p2', name: 'SitsOut', teamId: 'home'}),
    ];

    test('shows each player vote type per date or null for no vote, with the N/M count and never-joined marking', () => {
      const session = aSession({
        players: [...teamPlayers, aPlayer({id: 'a1', name: 'Away', teamId: 'away'})],
        proposedDates: [aProposedDate({id: 'pd-1'}), aProposedDate({id: 'pd-2'})],
        votes: [
          aVote({proposedDateId: 'pd-1', participantId: 'p1', type: 'Yes'}),
          aVote({proposedDateId: 'pd-2', participantId: 'p1', type: 'Maybe'}),
        ],
      });

      const results = new FakePostponementRules().ownTeamResults(session, 'home');

      expect(results)
        .toMatchObject([
          {
            dateId: 'pd-1',
            votes: [
              {playerId: 'p1', playerName: 'Voter', vote: 'Yes'},
              {playerId: 'p2', playerName: 'SitsOut', vote: null},
            ],
            voted: 1,
            total: 2,
            nonVoters: [{playerId: 'p2', playerName: 'SitsOut', joined: false}],
          },
          {
            dateId: 'pd-2',
            votes: [
              {playerId: 'p1', playerName: 'Voter', vote: 'Maybe'},
              {playerId: 'p2', playerName: 'SitsOut', vote: null},
            ],
            voted: 1,
            total: 2,
            nonVoters: [{playerId: 'p2', playerName: 'SitsOut', joined: false}],
          },
        ]);
    });

    test('uses every team player as the denominator even when no one voted', () => {
      const session = aSession({
        players: teamPlayers,
        proposedDates: [aProposedDate({id: 'pd-1'})],
      });

      const [result] = new FakePostponementRules().ownTeamResults(session, 'home');

      expect(result)
        .toEqual({
          dateId: 'pd-1',
          votes: [
            {playerId: 'p1', playerName: 'Voter', vote: null},
            {playerId: 'p2', playerName: 'SitsOut', vote: null},
          ],
          voted: 0,
          total: 2,
          nonVoters: [
            {playerId: 'p1', playerName: 'Voter', joined: false},
            {playerId: 'p2', playerName: 'SitsOut', joined: false},
          ],
        });
    });

    test('excludes opponent-team votes and players', () => {
      const session = aSession({
        players: [aPlayer({id: 'p1', name: 'Home', teamId: 'home'}), aPlayer({id: 'a1', name: 'Away', teamId: 'away'})],
        proposedDates: [aProposedDate({id: 'pd-1'})],
        votes: [
          aVote({proposedDateId: 'pd-1', participantId: 'p1', type: 'Yes'}),
          aVote({proposedDateId: 'pd-1', participantId: 'a1', type: 'No'}),
        ],
      });

      const [result] = new FakePostponementRules().ownTeamResults(session, 'home');

      expect(result)
        .toEqual({
          dateId: 'pd-1',
          votes: [{playerId: 'p1', playerName: 'Home', vote: 'Yes'}],
          voted: 1,
          total: 1,
          nonVoters: [],
        });
    });

    test('returns an empty array when the team has no proposed dates', () => {
      const session = aSession({players: teamPlayers});

      expect(new FakePostponementRules().ownTeamResults(session, 'home'))
        .toEqual([]);
    });
  });

  describe('default seams', () => {
    test('produce distinct ids and an ISO timestamp', () => {
      const rules = new PostponementRules();

      expect(rules.newId())
        .not
        .toBe(rules.newId());
      expect(rules.now())
        .toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

});
