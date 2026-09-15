import { describe, expect, test } from 'vitest';
import { aPlayer, aProposedDate, aSession, aVote } from '../../lib/__test-utils__/builders';
import { buildOpponentViewData } from './render-opponent';

describe('buildOpponentViewData', () => {
  test('names the away side when the organizer is home', () => {
    const session = aSession({organizerTeam: 'home', homeTeam: 'Home Squad', guestTeam: 'Guest Squad'});

    expect(buildOpponentViewData(session, 'en-US').opponentTeamName)
      .toBe('Guest Squad');
  });

  test('names the home side when the organizer is away', () => {
    const session = aSession({organizerTeam: 'away', homeTeam: 'Home Squad', guestTeam: 'Guest Squad'});

    expect(buildOpponentViewData(session, 'en-US').opponentTeamName)
      .toBe('Home Squad');
  });

  test('falls back to an empty name when the opponent side is unnamed', () => {
    const awayOrganizer = aSession({organizerTeam: 'away'});
    awayOrganizer.homeTeam = undefined;
    const homeOrganizer = aSession({organizerTeam: 'home'});
    homeOrganizer.guestTeam = undefined;

    expect(buildOpponentViewData(awayOrganizer, 'en-US').opponentTeamName)
      .toBe('');
    expect(buildOpponentViewData(homeOrganizer, 'en-US').opponentTeamName)
      .toBe('');
  });

  test('filters players to the opponent team only', () => {
    const session = aSession({
      organizerTeam: 'home',
      players: [
        aPlayer({id: 'op', name: 'Organizer', teamId: 'home'}),
        aPlayer({id: 'ap', name: 'Opponent', teamId: 'away'}),
      ],
    });

    expect(buildOpponentViewData(session, 'en-US').players)
      .toMatchObject([{id: 'ap', name: 'Opponent', teamId: 'away'}]);
  });

  test('lists only votable dates with the opponent-team tally and flags', () => {
    const session = aSession({
      organizerTeam: 'home',
      players: [aPlayer({id: 'ap', teamId: 'away'})],
      proposedDates: [
        aProposedDate({id: 'pd-1', votable: true, vetoed: true, acceptable: true}),
        aProposedDate({id: 'pd-2', votable: false}),
      ],
      votes: [aVote({proposedDateId: 'pd-1', participantId: 'ap', type: 'Yes'})],
    });

    expect(buildOpponentViewData(session, 'en-US').dates)
      .toMatchObject([
        {id: 'pd-1', vetoed: true, acceptable: true, yes: 1, no: 0, ifNecessary: 0},
      ]);
  });

  test('selects the away side lines when the organizer is home', () => {
    const session = aSession({
      organizerTeam: 'home',
      proposedDates: [
        aProposedDate({
          id: 'pd-1',
          votable: true,
          dateTimeRange: {start: '2026-09-01T20:00', end: '2026-09-01T22:00'},
          clashes: {
            home: [{opponent: 'Organizer Opp', start: '2026-09-01T19:00'}],
            away: [{opponent: 'Own Opp', start: '2026-09-01T21:00'}],
          },
        }),
      ],
    });

    expect(buildOpponentViewData(session, 'en-US').dates)
      .toMatchObject([
        {
          id: 'pd-1',
          dateTimeRange: {start: '2026-09-01T20:00', end: '2026-09-01T22:00'},
          ownClashes: [{opponent: 'Own Opp', start: '2026-09-01T21:00'}],
        },
      ]);
  });

  test('selects the home side lines when the organizer is away', () => {
    const session = aSession({
      organizerTeam: 'away',
      proposedDates: [
        aProposedDate({
          id: 'pd-1',
          votable: true,
          clashes: {
            home: [{opponent: 'Own Opp', start: '2026-09-01T19:00'}],
            away: [{opponent: 'Organizer Opp', start: '2026-09-01T21:00'}],
          },
        }),
      ],
    });

    expect(buildOpponentViewData(session, 'en-US').dates)
      .toMatchObject([{id: 'pd-1', ownClashes: [{opponent: 'Own Opp', start: '2026-09-01T19:00'}]}]);
  });

  test('reports an empty own-side selection for a checked-clean date', () => {
    const session = aSession({
      organizerTeam: 'home',
      proposedDates: [
        aProposedDate({id: 'pd-1', votable: true, clashes: {home: [], away: []}}),
      ],
    });

    expect(buildOpponentViewData(session, 'en-US').dates)
      .toMatchObject([{id: 'pd-1', ownClashes: []}]);
  });

  test('reports an absent own-side selection for a date with no clash data', () => {
    const session = aSession({
      organizerTeam: 'home',
      proposedDates: [aProposedDate({id: 'pd-1', votable: true})],
    });
    const dates = buildOpponentViewData(session, 'en-US').dates;

    expect(dates)
      .toHaveLength(1);
    expect(dates[0]?.ownClashes)
      .toBeUndefined();
  });

  test('marks the check runnable when the opponent side carries a team identity', () => {
    const session = aSession({
      organizerTeam: 'home',
      guestTeamIdentity: {championship: 'MTTV 26/27', group: '219397', teamtable: '1732193'},
    });

    expect(buildOpponentViewData(session, 'en-US').refreshCheckable)
      .toBe(true);
  });

  test('marks the check unrunnable when the opponent side has no team identity', () => {
    const session = aSession({organizerTeam: 'home'});

    expect(buildOpponentViewData(session, 'en-US').refreshCheckable)
      .toBe(false);
  });
});
