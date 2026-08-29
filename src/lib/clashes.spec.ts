import { Temporal } from '@js-temporal/polyfill';
import { describe, expect, test } from 'vitest';
import { aProposedDate } from './__test-utils__/builders';
import { CLASH_BUFFER_HOURS, computeClashes } from './clashes';
import type { OriginalMatchIdentity } from './clashes';
import type { Match } from './click-tt-scraper';

const HOME = 'Thun';
const AWAY = 'Ostermundigen';

const originalMatch: OriginalMatchIdentity = {
  start: '2026-08-29T16:00',
  homeTeam: HOME,
  guestTeam: AWAY,
};

function match(date: string, time: string, homeTeam: string, guestTeam: string): Match {
  return {day: 'Sa.', date, time, homeTeam, guestTeam};
}

function timeOf(isoDateTime: string): string {
  const dt = Temporal.PlainDateTime.from(isoDateTime);
  return `${String(dt.hour).padStart(2, '0')}:${String(dt.minute).padStart(2, '0')}`;
}

describe('computeClashes', () => {
  test('computes the exact clash sets per proposed date', () => {
    const proposedDates = [
      aProposedDate({id: 'pd-a', dateTimeRange: {start: '2026-09-05T18:00', end: '2026-09-05T18:00'}}),
      aProposedDate({id: 'pd-b', dateTimeRange: {start: '2026-09-12T18:00', end: '2026-09-12T18:00'}}),
    ];
    const homeSchedule = [
      match('29.08.2026', '16:00', HOME, AWAY),           // the postponed match itself
      match('05.09.2026', '17:00', HOME, 'Port'),         // in range
      match('05.09.2026', '18:30 v', HOME, 'Zollikofen'), // trailing junk after the time
      match('05.09.2026', '20:00', HOME, 'Bern'),         // exactly end + 2h
      match('05.09.2026', '15:59', HOME, 'Heimberg'),     // just below start - 2h
      match('12.09.2026', '18:00', HOME, 'Aarberg'),      // clashes on pd-b only
    ];
    const awaySchedule = [
      match('29.08.2026', '16:00', HOME, AWAY),           // the postponed match itself
      match('05.09.2026', '16:00', AWAY, 'Solothurn'),    // exactly start - 2h
      match('05.09.2026', '20:01', AWAY, 'Burgdorf'),     // just above end + 2h
    ];

    const clashes = computeClashes(proposedDates, homeSchedule, awaySchedule, originalMatch);

    expect(clashes)
      .toEqual({
        'pd-a': {
          home: [
            {opponent: 'Port', start: '2026-09-05T17:00'},
            {opponent: 'Zollikofen', start: '2026-09-05T18:30'},
            {opponent: 'Bern', start: '2026-09-05T20:00'},
          ],
          away: [
            {opponent: 'Solothurn', start: '2026-09-05T16:00'},
          ],
        },
        'pd-b': {
          home: [
            {opponent: 'Aarberg', start: '2026-09-12T18:00'},
          ],
          away: [],
        },
      });
  });

  test('counts games starting exactly at the ±2h buffer edges and skips just outside', () => {
    const rangeStart = '2026-09-05T18:00';
    const lowerEdge = Temporal.PlainDateTime.from(rangeStart)
      .subtract({hours: CLASH_BUFFER_HOURS})
      .toString();
    const upperEdge = Temporal.PlainDateTime.from(rangeStart)
      .add({hours: CLASH_BUFFER_HOURS})
      .toString();
    const justBefore = Temporal.PlainDateTime.from(lowerEdge)
      .subtract({minutes: 1})
      .toString();
    const justAfter = Temporal.PlainDateTime.from(upperEdge)
      .add({minutes: 1})
      .toString();

    const clashes = computeClashes(
      [aProposedDate({id: 'pd-1', dateTimeRange: {start: rangeStart, end: rangeStart}})],
      [
        match('05.09.2026', timeOf(lowerEdge), HOME, 'AtLowerEdge'),
        match('05.09.2026', timeOf(justBefore), HOME, 'JustBefore'),
        match('05.09.2026', timeOf(upperEdge), HOME, 'AtUpperEdge'),
        match('05.09.2026', timeOf(justAfter), HOME, 'JustAfter'),
      ],
      [],
      originalMatch,
    );

    expect(clashes['pd-1']?.home)
      .toEqual([
        {opponent: 'AtLowerEdge', start: `2026-09-05T${timeOf(lowerEdge)}`},
        {opponent: 'AtUpperEdge', start: `2026-09-05T${timeOf(upperEdge)}`},
      ]);
  });

  test('splits clashes per team and reports a game on both team pages on both sides', () => {
    const shared = match('05.09.2026', '19:00', HOME, AWAY); // a rematch listed on both pages
    const homeSchedule = [
      match('05.09.2026', '17:00', HOME, 'Port'),       // Thun home game
      match('05.09.2026', '17:30', 'Bern', HOME),       // Thun away game: opponent is Bern
      shared,
    ];
    const awaySchedule = [
      match('05.09.2026', '17:00', AWAY, 'Port'),       // Ostermundigen home game: opponent is Port
      match('05.09.2026', '17:30', 'Burgdorf', AWAY),   // Ostermundigen away game
      shared,
    ];

    const clashes = computeClashes(
      [aProposedDate({id: 'pd-1', dateTimeRange: {start: '2026-09-05T18:00', end: '2026-09-05T18:00'}})],
      homeSchedule,
      awaySchedule,
      originalMatch,
    );

    expect(clashes['pd-1'])
      .toEqual({
        home: [
          {opponent: 'Port', start: '2026-09-05T17:00'},
          {opponent: 'Bern', start: '2026-09-05T17:30'},
          {opponent: AWAY, start: '2026-09-05T19:00'},
        ],
        away: [
          {opponent: 'Port', start: '2026-09-05T17:00'},
          {opponent: 'Burgdorf', start: '2026-09-05T17:30'},
          {opponent: HOME, start: '2026-09-05T19:00'},
        ],
      });
  });

  test('excludes the postponed match itself from both schedules', () => {
    const proposedDates = [
      aProposedDate({id: 'pd-1', dateTimeRange: {start: '2026-08-29T18:00', end: '2026-08-29T18:00'}}),
    ];
    // The postponed match at 16:00 falls exactly on the start - 2h edge of the
    // proposed range; a same-date game against a different team still clashes.
    const homeSchedule = [
      match('29.08.2026', '16:00', HOME, AWAY),
      match('29.08.2026', '16:00', HOME, 'Port'),
    ];
    const awaySchedule = [
      match('29.08.2026', '16:00', HOME, AWAY),
    ];

    const clashes = computeClashes(proposedDates, homeSchedule, awaySchedule, originalMatch);

    expect(clashes['pd-1'])
      .toEqual({
        home: [{opponent: 'Port', start: '2026-08-29T16:00'}],
        away: [],
      });
  });

  test('reports every clashing game on a date, not just the first', () => {
    const clashes = computeClashes(
      [aProposedDate({id: 'pd-1', dateTimeRange: {start: '2026-09-05T18:00', end: '2026-09-05T18:00'}})],
      [
        match('05.09.2026', '16:30', HOME, 'Port'),
        match('05.09.2026', '17:15', HOME, 'Bern'),
        match('05.09.2026', '19:45', HOME, 'Heimberg'),
      ],
      [],
      originalMatch,
    );

    expect(clashes['pd-1']?.home)
      .toEqual([
        {opponent: 'Port', start: '2026-09-05T16:30'},
        {opponent: 'Bern', start: '2026-09-05T17:15'},
        {opponent: 'Heimberg', start: '2026-09-05T19:45'},
      ]);
  });

  test('applies the buffer to both ends of a real date-time range', () => {
    const clashes = computeClashes(
      [aProposedDate({id: 'pd-1', dateTimeRange: {start: '2026-09-05T14:00', end: '2026-09-05T16:00'}})],
      [
        match('05.09.2026', '12:00', HOME, 'AtStartEdge'),
        match('05.09.2026', '18:00', HOME, 'AtEndEdge'),
        match('05.09.2026', '11:59', HOME, 'JustBefore'),
      ],
      [],
      originalMatch,
    );

    expect(clashes['pd-1']?.home)
      .toEqual([
        {opponent: 'AtStartEdge', start: '2026-09-05T12:00'},
        {opponent: 'AtEndEdge', start: '2026-09-05T18:00'},
      ]);
  });

  test('yields empty clash sets for empty schedules, keyed per proposed date', () => {
    const proposedDates = [
      aProposedDate({id: 'pd-1', dateTimeRange: {start: '2026-09-05T18:00', end: '2026-09-05T18:00'}}),
      aProposedDate({id: 'pd-2', dateTimeRange: {start: '2026-09-12T18:00', end: '2026-09-12T18:00'}}),
    ];

    const clashes = computeClashes(proposedDates, [], [], originalMatch);

    expect(clashes)
      .toEqual({
        'pd-1': {home: [], away: []},
        'pd-2': {home: [], away: []},
      });
  });

  test('handles a hand-entered match (no identity): nothing is excluded', () => {
    const clashes = computeClashes(
      [aProposedDate({id: 'pd-1', dateTimeRange: {start: '2026-08-29T18:00', end: '2026-08-29T18:00'}})],
      [match('29.08.2026', '16:00', HOME, AWAY)],
      [],
    );

    expect(clashes['pd-1'])
      .toEqual({
        home: [{opponent: AWAY, start: '2026-08-29T16:00'}],
        away: [],
      });
  });
});