import { describe, expect, test } from 'vitest';
import { generateProposedDates, type ProposedDateTuple } from './proposed-dates-generator';

/**
 * Pure-module spec: assert every branch of the planning-window walker covered
 * by the issue's acceptance criteria. No Hono context, no fixtures, no monkey
 * patching — just ISO strings in, ISO strings out.
 *
 * Convention notes:
 * - Weekdays use Temporal/ISO numbering: 1 = Monday .. 7 = Sunday.
 * - All dates cluster around Aug–Sep 2026 so weekday arithmetic is human-auditable.
 */
const TODAY_TUE_25_AUG = '2026-08-25T08:00';
const ANCHOR_WED_2_SEP = '2026-09-02T16:00';

describe('generateProposedDates', () => {

  describe('window computation', () => {
    test('walks from max(today, anchor - 8w) to anchor + 4w in 7-day strides', () => {
      // Tue 8/25 → first Mon ≥ today is Mon 8/31.
      // Mon 8/31, 9/07, 9/14, 9/21, 9/28 all ≤ upper Wed 9/30T16:00.
      // Mon 10/05 > upper → stop. 5 Mondays at 20:00.
      const result = generateProposedDates({
        anchorIso: ANCHOR_WED_2_SEP,
        todayIso: TODAY_TUE_25_AUG,
        tuples: [{weekday: 1, hour: 20, minute: 0}],
        existingStarts: [],
      });

      expect(result.usedFallbackWindow)
        .toBe(false);
      expect(result.skipped)
        .toBe(0);
      expect(result.added)
        .toEqual([
          '2026-08-31T20:00',
          '2026-09-07T20:00',
          '2026-09-14T20:00',
          '2026-09-21T20:00',
          '2026-09-28T20:00',
        ]);
    });

    test('uses anchor - 8w when it is later than today', () => {
      // Today: Mon 2026-08-24 (early). Anchor: Mon 2026-12-28 (4 months out).
      // anchor - 8w = Mon 2026-11-02 > today → lower = back.
      // First Mon ≥ back is Mon 11/02 (not 8/31, which is "today-relative").
      const result = generateProposedDates({
        anchorIso: '2026-12-28T16:00',
        todayIso: '2026-08-24T08:00',
        tuples: [{weekday: 1, hour: 20, minute: 0}],
        existingStarts: [],
      });

      expect(result.added[0])
        .toBe('2026-11-02T20:00');
      // upper = Mon 2027-01-25T16:00; last candidate ≤ upper is Mon 1/18T20:00 (Mon 1/25T20:00 > upper).
      expect(result.added.at(-1))
        .toBe('2027-01-18T20:00');
      expect(result.added)
        .toEqual([
          '2026-11-02T20:00',
          '2026-11-09T20:00',
          '2026-11-16T20:00',
          '2026-11-23T20:00',
          '2026-11-30T20:00',
          '2026-12-07T20:00',
          '2026-12-14T20:00',
          '2026-12-21T20:00',
          '2026-12-28T20:00',
          '2027-01-04T20:00',
          '2027-01-11T20:00',
          '2027-01-18T20:00',
        ]);
    });

    test('inclusive: a candidate exactly at the upper bound is included', () => {
      // Anchor at Mon 20:00 → upper = Mon + 4w at the same wall-time.
      // The Monday exactly 4 weeks out sits at the upper bound and must be added.
      const result = generateProposedDates({
        anchorIso: '2026-12-28T20:00',
        todayIso: '2026-08-24T08:00',
        tuples: [{weekday: 1, hour: 20, minute: 0}],
        existingStarts: [],
      });

      expect(result.added)
        .toContain('2027-01-25T20:00');
    });
  });

  describe('past-edge drops', () => {
    test('drops a candidate on the lower edge when today is on the same weekday at a later time', () => {
      // Today: Mon 8/24T22:00. Anchor: Mon 9/14T16:00.
      // First Mon ≥ today is Mon 8/24 (same day); Mon 8/24T20:00 < today → past.
      // Walk: 8/31, 9/07, 9/14, 9/21, 9/28, 10/05 — 6 dates. 10/12 > upper = Mon 10/12T16:00 → stop.
      const result = generateProposedDates({
        anchorIso: '2026-09-14T16:00',
        todayIso: '2026-08-24T22:00',
        tuples: [{weekday: 1, hour: 20, minute: 0}],
        existingStarts: [],
      });

      expect(result.added)
        .not
        .toContain('2026-08-24T20:00');
      expect(result.added)
        .toEqual([
          '2026-08-31T20:00',
          '2026-09-07T20:00',
          '2026-09-14T20:00',
          '2026-09-21T20:00',
          '2026-09-28T20:00',
          '2026-10-05T20:00',
        ]);
      // Past candidates don't count toward `skipped` — only dedupe does.
      expect(result.skipped)
        .toBe(0);
    });

    test('drops all candidates when the upper bound has already elapsed (anchor in past)', () => {
      const result = generateProposedDates({
        anchorIso: '2020-01-15T16:00',
        todayIso: TODAY_TUE_25_AUG,
        tuples: [{weekday: 1, hour: 20, minute: 0}],
        existingStarts: [],
      });

      expect(result.added)
        .toEqual([]);
      expect(result.skipped)
        .toBe(0);
      expect(result.usedFallbackWindow)
        .toBe(false);
    });
  });

  describe('multiple tuples', () => {
    test('same weekday at different times produces independent rows', () => {
      // 5 Mondays × 2 timeslots (20:00, 14:00) = 10 dates.
      const result = generateProposedDates({
        anchorIso: ANCHOR_WED_2_SEP,
        todayIso: TODAY_TUE_25_AUG,
        tuples: [
          {weekday: 1, hour: 20, minute: 0},
          {weekday: 1, hour: 14, minute: 0},
        ],
        existingStarts: [],
      });

      expect(result.added)
        .toEqual([
          '2026-08-31T20:00',
          '2026-09-07T20:00',
          '2026-09-14T20:00',
          '2026-09-21T20:00',
          '2026-09-28T20:00',
          '2026-08-31T14:00',
          '2026-09-07T14:00',
          '2026-09-14T14:00',
          '2026-09-21T14:00',
          '2026-09-28T14:00',
        ]);
    });

    test('different weekdays each contribute their own dates', () => {
      // 5 Mondays + 5 Wednesdays (8/26, 9/2, 9/9, 9/16, 9/23) = 10 dates.
      const result = generateProposedDates({
        anchorIso: ANCHOR_WED_2_SEP,
        todayIso: TODAY_TUE_25_AUG,
        tuples: [
          {weekday: 1, hour: 20, minute: 0},
          {weekday: 3, hour: 20, minute: 0},
        ],
        existingStarts: [],
      });

      expect(result.added)
        .toEqual([
          '2026-08-31T20:00',
          '2026-09-07T20:00',
          '2026-09-14T20:00',
          '2026-09-21T20:00',
          '2026-09-28T20:00',
          '2026-08-26T20:00',
          '2026-09-02T20:00',
          '2026-09-09T20:00',
          '2026-09-16T20:00',
          '2026-09-23T20:00',
        ]);
    });
  });

  describe('dedupe against existingStarts', () => {
    test('duplicates count toward skipped and never appear in added', () => {
      const result = generateProposedDates({
        anchorIso: ANCHOR_WED_2_SEP,
        todayIso: TODAY_TUE_25_AUG,
        tuples: [{weekday: 1, hour: 20, minute: 0}],
        existingStarts: ['2026-09-07T20:00:00'],
      });

      expect(result.added)
        .not
        .toContain('2026-09-07T20:00');
      expect(result.added)
        .toEqual([
          '2026-08-31T20:00',
          '2026-09-14T20:00',
          '2026-09-21T20:00',
          '2026-09-28T20:00',
        ]);
      expect(result.skipped)
        .toBe(1);
    });

    test('matches existingStarts at minute precision regardless of seconds in input format', () => {
      // The two existingStarts values are the same minute, so only one counts toward skipped.
      const result = generateProposedDates({
        anchorIso: ANCHOR_WED_2_SEP,
        todayIso: TODAY_TUE_25_AUG,
        tuples: [{weekday: 1, hour: 20, minute: 0}],
        existingStarts: ['2026-09-07T20:00', '2026-09-07T20:00:00'],
      });

      expect(result.skipped)
        .toBe(1);
      expect(result.added)
        .not
        .toContain('2026-09-07T20:00');
    });
  });

  describe('cap = 14', () => {
    test('only the first 14 tuples are processed when more are submitted', () => {
      const fourteen: ProposedDateTuple[] = Array.from(
        {length: 14},
        (_, i): ProposedDateTuple => ({weekday: 1, hour: i, minute: 0}),
      );

      const expected = generateProposedDates({
        anchorIso: ANCHOR_WED_2_SEP,
        todayIso: TODAY_TUE_25_AUG,
        tuples: fourteen,
        existingStarts: [],
      });

      // Append a sentinel tuple with a marker hour. If it were processed, that
      // hour would appear in `added`. Slicing keeps it out.
      const truncated = generateProposedDates({
        anchorIso: ANCHOR_WED_2_SEP,
        todayIso: TODAY_TUE_25_AUG,
        tuples: [...fourteen, {weekday: 1, hour: 14, minute: 0}],
        existingStarts: [],
      });

      expect(truncated.added)
        .toEqual(expected.added);
      expect(truncated.added.every((iso) => Number(iso.slice(11, 13)) < 14))
        .toBe(true);
    });
  });

  describe('anchor fallback', () => {
    test('collapses to [today, today + 4w] and flags usedFallbackWindow when anchor is missing', () => {
      // lower = Tue 8/25T08:00, upper = Tue 9/22T08:00.
      // First Mon ≥ Tue 8/25 = Mon 8/31.
      // 8/31, 9/7, 9/14, 9/21 ≤ Tue 9/22T08:00. 9/28 > upper → stop. 4 dates.
      const result = generateProposedDates({
        anchorIso: undefined,
        todayIso: TODAY_TUE_25_AUG,
        tuples: [{weekday: 1, hour: 20, minute: 0}],
        existingStarts: [],
      });

      expect(result.usedFallbackWindow)
        .toBe(true);
      expect(result.skipped)
        .toBe(0);
      expect(result.added)
        .toEqual([
          '2026-08-31T20:00',
          '2026-09-07T20:00',
          '2026-09-14T20:00',
          '2026-09-21T20:00',
        ]);
    });
  });

  describe('impossible wall-times', () => {
    test('out-of-range hour is silently filtered and does not crash the loop', () => {
      // First tuple (hour=25) yields no candidates via strict-ISO round-trip.
      // The loop continues with subsequent tuples.
      const result = generateProposedDates({
        anchorIso: ANCHOR_WED_2_SEP,
        todayIso: TODAY_TUE_25_AUG,
        tuples: [
          {weekday: 1, hour: 25, minute: 0},
          {weekday: 3, hour: 20, minute: 0},
        ],
        existingStarts: [],
      });

      // 5 Wednesdays (8/26, 9/2, 9/9, 9/16, 9/23) — Wed 9/30T20:00 > upper.
      expect(result.added)
        .toEqual([
          '2026-08-26T20:00',
          '2026-09-02T20:00',
          '2026-09-09T20:00',
          '2026-09-16T20:00',
          '2026-09-23T20:00',
        ]);
      expect(result.added.every((iso) => iso.endsWith('T20:00')))
        .toBe(true);
    });

    test('out-of-range minute is silently filtered and does not crash the loop', () => {
      const result = generateProposedDates({
        anchorIso: ANCHOR_WED_2_SEP,
        todayIso: TODAY_TUE_25_AUG,
        tuples: [{weekday: 1, hour: 20, minute: 70}],
        existingStarts: [],
      });

      expect(result.added)
        .toEqual([]);
      expect(result.skipped)
        .toBe(0);
    });

    test('does not throw on a Sun 02:30 candidate (PlainDateTime is timezone-naive)', () => {
      // ponytail: PlainDateTime lacks timezone awareness, so DST-impossible
      // wall-times still round-trip. The strict-ISO pattern catches calendar
      // impossibles; DST narrowing happens at the handler boundary.
      expect(() => generateProposedDates({
        anchorIso: ANCHOR_WED_2_SEP,
        todayIso: '2026-03-29T10:00',
        tuples: [{weekday: 7, hour: 2, minute: 30}],
        existingStarts: [],
      }))
        .not
        .toThrow();
    });
  });

  describe('empty input', () => {
    test('returns an empty result for an empty tuple list', () => {
      const result = generateProposedDates({
        anchorIso: ANCHOR_WED_2_SEP,
        todayIso: TODAY_TUE_25_AUG,
        tuples: [],
        existingStarts: [],
      });

      expect(result)
        .toEqual({added: [], skipped: 0, usedFallbackWindow: false});
    });
  });

});
