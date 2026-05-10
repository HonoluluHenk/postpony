import { Temporal } from '@js-temporal/polyfill';

/**
 * Utility functions for date and time operations using the ECMAScript Temporal API.
 */

/**
 * A range of PlainDateTime with a start and end.
 */
export interface DateTimeRange {
  start: Temporal.PlainDateTime;
  end: Temporal.PlainDateTime;
}

/**
 * Checks if two DateTimeRanges overlap.
 */
export function doRangesOverlap(range1: DateTimeRange, range2: DateTimeRange): boolean {
  const compare = (a: Temporal.PlainDateTime, b: Temporal.PlainDateTime) => {
    return Temporal.PlainDateTime.compare(a, b);
  };

  return compare(range1.start, range2.end) < 0 && compare(range2.start, range1.end) < 0;
}

/**
 * Formats a Temporal object to a localized string.
 */
export function formatLocalizedDateTime(
  dateTime: Temporal.PlainDateTime | Temporal.ZonedDateTime | Temporal.PlainDate,
  locale: 'de-DE' | 'en-GB' | 'en-US' = 'de-DE',
  options: Intl.DateTimeFormatOptions = {
    dateStyle: 'medium',
    timeStyle: 'short',
  }
): string {
  return dateTime.toLocaleString(locale, options);
}

/**
 * Parses an ISO string into a PlainDateTime.
 */
export function parseIsoToPlainDateTime(isoString: string): Temporal.PlainDateTime {
  return Temporal.PlainDateTime.from(isoString);
}

/**
 * Gets the current date and time in a specific time zone.
 */
export function getCurrentZonedDateTime(timeZone: string = 'Europe/Zurich'): Temporal.ZonedDateTime {
  return Temporal.Now.zonedDateTimeISO(timeZone);
}

/**
 * Calculates the intersection of two time ranges.
 * Returns null if they don't overlap.
 */
export function intersectRanges<T extends Temporal.PlainDateTime | Temporal.ZonedDateTime>(
  start1: T,
  end1: T,
  start2: T,
  end2: T
): { start: T; end: T } | null {
  const compare = (a: any, b: any) => {
    if (a instanceof Temporal.PlainDateTime && b instanceof Temporal.PlainDateTime) {
      return Temporal.PlainDateTime.compare(a, b);
    }
    if (a instanceof Temporal.ZonedDateTime && b instanceof Temporal.ZonedDateTime) {
      return Temporal.ZonedDateTime.compare(a, b);
    }
    throw new Error('Cannot compare different Temporal types or non-Temporal types');
  };

  const start = (compare(start1, start2) > 0 ? start1 : start2) as T;
  const end = (compare(end1, end2) < 0 ? end1 : end2) as T;

  if (compare(start, end) < 0) {
    return { start, end };
  }
  return null;
}

/**
 * Calculates the intersection of two DateTimeRanges.
 */
export function intersectDateTimeRanges(
  range1: DateTimeRange,
  range2: DateTimeRange
): DateTimeRange | null {
  const intersection = intersectRanges(range1.start, range1.end, range2.start, range2.end);
  return intersection as DateTimeRange | null;
}

