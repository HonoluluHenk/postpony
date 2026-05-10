import { describe, test, expect } from 'vitest';
import { Temporal } from '@js-temporal/polyfill';
import { doRangesOverlap, intersectRanges, formatLocalizedDateTime, DateTimeRange, intersectDateTimeRanges } from './temporal-utils';

describe('Temporal Utils', () => {
  test('DateTimeRange overlap and intersection', () => {
    const range1: DateTimeRange = {
      start: Temporal.PlainDateTime.from('2026-05-10T10:00:00'),
      end: Temporal.PlainDateTime.from('2026-05-10T12:00:00')
    };
    const range2: DateTimeRange = {
      start: Temporal.PlainDateTime.from('2026-05-10T11:00:00'),
      end: Temporal.PlainDateTime.from('2026-05-10T13:00:00')
    };

    expect(doRangesOverlap(range1, range2)).toBe(true);

    const intersection = intersectDateTimeRanges(range1, range2);
    expect(intersection).not.toBeNull();
    expect(intersection?.start.toString()).toBe('2026-05-10T11:00:00');
    expect(intersection?.end.toString()).toBe('2026-05-10T12:00:00');
  });

  test('doRangesOverlap should correctly identify overlapping ranges', () => {
    const range1: DateTimeRange = {
      start: Temporal.PlainDateTime.from('2026-05-10T10:00:00'),
      end: Temporal.PlainDateTime.from('2026-05-10T12:00:00')
    };
    const range2: DateTimeRange = {
      start: Temporal.PlainDateTime.from('2026-05-10T11:00:00'),
      end: Temporal.PlainDateTime.from('2026-05-10T13:00:00')
    };

    expect(doRangesOverlap(range1, range2)).toBe(true);
  });

  test('doRangesOverlap should correctly identify non-overlapping ranges', () => {
    const range1: DateTimeRange = {
      start: Temporal.PlainDateTime.from('2026-05-10T10:00:00'),
      end: Temporal.PlainDateTime.from('2026-05-10T11:00:00')
    };
    const range2: DateTimeRange = {
      start: Temporal.PlainDateTime.from('2026-05-10T12:00:00'),
      end: Temporal.PlainDateTime.from('2026-05-10T13:00:00')
    };

    expect(doRangesOverlap(range1, range2)).toBe(false);
  });

  test('intersectRanges should return the correct intersection', () => {
    const start1 = Temporal.PlainDateTime.from('2026-05-10T10:00:00');
    const end1 = Temporal.PlainDateTime.from('2026-05-10T12:00:00');

    const start2 = Temporal.PlainDateTime.from('2026-05-10T11:00:00');
    const end2 = Temporal.PlainDateTime.from('2026-05-10T13:00:00');

    const intersection = intersectRanges(start1, end1, start2, end2);
    expect(intersection).not.toBeNull();
    expect(intersection?.start.toString()).toBe('2026-05-10T11:00:00');
    expect(intersection?.end.toString()).toBe('2026-05-10T12:00:00');
  });

  test('formatLocalizedDateTime should format correctly for German', () => {
    const dt = Temporal.PlainDateTime.from('2026-05-10T10:30:00');
    const formatted = formatLocalizedDateTime(dt, 'de-DE');
    // Result depends on the environment's locale data, but we can check if it contains expected parts
    expect(formatted).toContain('10.05.2026');
    expect(formatted).toContain('10:30');
  });
});
