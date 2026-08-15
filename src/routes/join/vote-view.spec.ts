import { describe, expect, test } from 'vitest';
import { aPlayer, aProposedDate, aSession, aVote } from '../../lib/__test-utils__/builders';
import { buildPlayerVoteRows, visibleDatesForTeam } from './vote-view';

describe('visibleDatesForTeam', () => {
  test('home team sees every proposed date', () => {
    const session = aSession({
      proposedDates: [
        aProposedDate({id: 'date-1', votableByOpponent: false}),
        aProposedDate({id: 'date-2', votableByOpponent: true}),
      ],
    });

    expect(visibleDatesForTeam(session, 'home').map((pd) => pd.id))
      .toEqual(['date-1', 'date-2']);
  });

  test('away team only sees dates the organizer proposed to them', () => {
    const session = aSession({
      proposedDates: [
        aProposedDate({id: 'date-1', votableByOpponent: false}),
        aProposedDate({id: 'date-2', votableByOpponent: true}),
      ],
    });

    expect(visibleDatesForTeam(session, 'away').map((pd) => pd.id))
      .toEqual(['date-2']);
  });
});

describe('buildPlayerVoteRows', () => {
  const dates = [
    aProposedDate({id: 'date-1'}),
    aProposedDate({id: 'date-2'}),
  ];

  test('home voter sees only home player names', () => {
    const session = aSession({
      players: [
        aPlayer({id: 'home-1', name: 'Alice', teamId: 'home'}),
        aPlayer({id: 'away-1', name: 'Bob', teamId: 'away'}),
      ],
    });

    const rows = buildPlayerVoteRows(session, 'home', dates);

    expect(rows.map((row) => row.playerName))
      .toEqual(['Alice']);
  });

  test('away voter sees only away player names', () => {
    const session = aSession({
      players: [
        aPlayer({id: 'home-1', name: 'Alice', teamId: 'home'}),
        aPlayer({id: 'away-1', name: 'Bob', teamId: 'away'}),
        aPlayer({id: 'away-2', name: 'Carol', teamId: 'away'}),
      ],
    });

    const rows = buildPlayerVoteRows(session, 'away', dates);

    expect(rows.map((row) => row.playerName))
      .toEqual(['Bob', 'Carol']);
  });

  test('a player without a vote shows null for that date', () => {
    const session = aSession({
      players: [
        aPlayer({id: 'home-1', name: 'Alice', teamId: 'home'}),
      ],
      votes: [
        aVote({participantId: 'home-1', proposedDateId: 'date-1', type: 'Yes'}),
      ],
    });

    const rows = buildPlayerVoteRows(session, 'home', dates);

    expect(rows[0]?.votes)
      .toEqual(['Yes', null]);
  });

  test('votes align with their date position', () => {
    const session = aSession({
      players: [
        aPlayer({id: 'home-1', name: 'Alice', teamId: 'home'}),
      ],
      votes: [
        aVote({participantId: 'home-1', proposedDateId: 'date-2', type: 'Maybe'}),
      ],
    });

    const rows = buildPlayerVoteRows(session, 'home', dates);

    expect(rows[0]?.votes)
      .toEqual([null, 'Maybe']);
  });

  test('re-voting updates the cell in place', () => {
    const session = aSession({
      players: [
        aPlayer({id: 'home-1', name: 'Alice', teamId: 'home'}),
      ],
      votes: [
        aVote({participantId: 'home-1', proposedDateId: 'date-1', type: 'No'}),
      ],
    });

    const rows = buildPlayerVoteRows(session, 'home', dates);

    expect(rows[0]?.votes)
      .toEqual(['No', null]);
  });

  test('returns an empty list when the team has no players', () => {
    const session = aSession({players: []});

    expect(buildPlayerVoteRows(session, 'home', dates))
      .toEqual([]);
  });
});