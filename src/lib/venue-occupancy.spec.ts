import { Temporal } from '@js-temporal/polyfill';
import { describe, expect, test } from 'vitest';
import { aProposedDate } from './__test-utils__/builders';
import { CLASH_BUFFER_HOURS, type OriginalMatchIdentity } from './clashes';
import type { Match } from './click-tt-scraper';
import type { ProposedDate } from './models';
import { computeVenueOccupancy } from './venue-occupancy';

const HOME = 'Thun';
const AWAY = 'Ostermundigen';

const originalMatch: OriginalMatchIdentity = {
  start: '2026-08-29T16:00',
  homeTeam: HOME,
  guestTeam: AWAY,
};

function match(date: string, time: string, guestTeam: string, venueNumber?: number): Match {
  return {day: 'Sa.', date, time, homeTeam: HOME, guestTeam, venueNumber};
}

function timeOf(isoDateTime: string): string {
  const dt = Temporal.PlainDateTime.from(isoDateTime);
  return `${String(dt.hour).padStart(2, '0')}:${String(dt.minute).padStart(2, '0')}`;
}

describe('computeVenueOccupancy', () => {
  test('computes the exact occupancy counts and matches per proposed date', () => {
    const proposedDates = [
      aProposedDate({id: 'pd-a', dateTimeRange: {start: '2026-09-05T18:00', end: '2026-09-05T18:00'}}),
      aProposedDate({id: 'pd-b', dateTimeRange: {start: '2026-09-12T18:00', end: '2026-09-12T18:00'}, venueNumber: 2}),
    ];
    const homeSchedule = [
      match('05.09.2026', '17:00', 'Port', 1),         // in range on pd-a (venue 1)
      match('05.09.2026', '17:00', 'Bern', 2),         // same time, different venue
      match('05.09.2026', '20:00', 'Zollikofen', 1),   // exactly end + 2h
      match('05.09.2026', '15:59', 'Heimberg', 1),     // just below start - 2h
      match('05.09.2026', '18:00', 'NoTime'),          // no venue number, skipped
      match('05.09.2026', '', 'Unparsable', 1),        // unparsable time, skipped
      match('12.09.2026', '18:00', 'Aarberg', 2),      // in range on pd-b only
    ];

    const occupancy = computeVenueOccupancy(proposedDates, homeSchedule, originalMatch);

    expect(occupancy)
      .toEqual({
        'pd-a': {
          count: 2,
          matches: [
            {opponent: 'Port', start: '2026-09-05T17:00'},
            {opponent: 'Zollikofen', start: '2026-09-05T20:00'},
          ],
        },
        'pd-b': {
          count: 1,
          matches: [
            {opponent: 'Aarberg', start: '2026-09-12T18:00'},
          ],
        },
      });
  });

  test('counts matches starting exactly at the ±2h buffer edges and skips just outside', () => {
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

    const occupancy = computeVenueOccupancy(
      [aProposedDate({id: 'pd-1', dateTimeRange: {start: rangeStart, end: rangeStart}})],
      [
        match('05.09.2026', timeOf(lowerEdge), 'AtLowerEdge', 1),
        match('05.09.2026', timeOf(justBefore), 'JustBefore', 1),
        match('05.09.2026', timeOf(upperEdge), 'AtUpperEdge', 1),
        match('05.09.2026', timeOf(justAfter), 'JustAfter', 1),
      ],
      originalMatch,
    );

    expect(occupancy['pd-1'])
      .toEqual({
        count: 2,
        matches: [
          {opponent: 'AtLowerEdge', start: `2026-09-05T${timeOf(lowerEdge)}`},
          {opponent: 'AtUpperEdge', start: `2026-09-05T${timeOf(upperEdge)}`},
        ],
      });
  });

  test('counts only matches at the date\'s venue, not other venues at the same time', () => {
    const occupancy = computeVenueOccupancy(
      [aProposedDate({id: 'pd-1', dateTimeRange: {start: '2026-09-05T18:00', end: '2026-09-05T18:00'}})],
      [
        match('05.09.2026', '18:00', 'Port', 1),
        match('05.09.2026', '18:00', 'Bern', 2),
        match('05.09.2026', '18:00', 'Zollikofen', 3),
      ],
      originalMatch,
    );

    expect(occupancy['pd-1'])
      .toEqual({
        count: 1,
        matches: [{opponent: 'Port', start: '2026-09-05T18:00'}],
      });
  });

  test('a proposed date without a venue number checks venue 1 (legacy dates)', () => {
    const legacyDate: ProposedDate = {
      id: 'pd-legacy',
      sessionId: 'test-session',
      dateTimeRange: {start: '2026-09-05T18:00', end: '2026-09-05T18:00'},
      proposerId: 'player-1',
      votable: true,
    };

    const occupancy = computeVenueOccupancy(
      [legacyDate],
      [
        match('05.09.2026', '18:00', 'Port', 1),
        match('05.09.2026', '18:00', 'Bern', 2),
      ],
      originalMatch,
    );

    expect(occupancy['pd-legacy'])
      .toEqual({
        count: 1,
        matches: [{opponent: 'Port', start: '2026-09-05T18:00'}],
      });
  });

  test('excludes the postponed match itself', () => {
    const occupancy = computeVenueOccupancy(
      [aProposedDate({id: 'pd-1', dateTimeRange: {start: '2026-08-29T18:00', end: '2026-08-29T18:00'}})],
      [
        match('29.08.2026', '16:00', AWAY, 1),   // the postponed match, excluded
        match('29.08.2026', '16:00', 'Port', 1), // same date, different opponent, counted
      ],
      originalMatch,
    );

    expect(occupancy['pd-1'])
      .toEqual({
        count: 1,
        matches: [{opponent: 'Port', start: '2026-08-29T16:00'}],
      });
  });

  test('skips matches without a venue number instead of guessing venue 1', () => {
    const occupancy = computeVenueOccupancy(
      [aProposedDate({id: 'pd-1', dateTimeRange: {start: '2026-09-05T18:00', end: '2026-09-05T18:00'}})],
      [
        match('05.09.2026', '18:00', 'NoVenue'),
        match('05.09.2026', '17:30', 'WithVenue', 1),
      ],
      originalMatch,
    );

    expect(occupancy['pd-1'])
      .toEqual({
        count: 1,
        matches: [{opponent: 'WithVenue', start: '2026-09-05T17:30'}],
      });
  });

  test('yields empty occupancy per proposed date for an empty schedule', () => {
    const proposedDates = [
      aProposedDate({id: 'pd-1', dateTimeRange: {start: '2026-09-05T18:00', end: '2026-09-05T18:00'}}),
      aProposedDate({id: 'pd-2', dateTimeRange: {start: '2026-09-12T18:00', end: '2026-09-12T18:00'}}),
    ];

    const occupancy = computeVenueOccupancy(proposedDates, [], originalMatch);

    expect(occupancy)
      .toEqual({
        'pd-1': {count: 0, matches: []},
        'pd-2': {count: 0, matches: []},
      });
  });

  test('handles a hand-entered match (no identity): nothing is excluded', () => {
    const occupancy = computeVenueOccupancy(
      [aProposedDate({id: 'pd-1', dateTimeRange: {start: '2026-08-29T18:00', end: '2026-08-29T18:00'}})],
      [match('29.08.2026', '16:00', AWAY, 1)],
    );

    expect(occupancy['pd-1'])
      .toEqual({
        count: 1,
        matches: [{opponent: AWAY, start: '2026-08-29T16:00'}],
      });
  });
});