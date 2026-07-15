import { Temporal } from '@js-temporal/polyfill';
import ComparisonResult = Temporal.ComparisonResult;

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
  const compare = (a: Temporal.PlainDateTime, b: Temporal.PlainDateTime): ComparisonResult => {
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
  },
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
 * Matches the value format produced by an `<input type="datetime-local">`.
 */
export const DATETIME_LOCAL_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

/**
 * Converts a click-tt.ch meeting's `date` (`dd.mm.yyyy`) and `time` (`HH:mm`,
 * possibly with trailing junk such as `"19:45 v"`) into a datetime-local value.
 * Returns undefined if either input doesn't match the expected shape.
 */
export function parseClickTtDateTime(date: string, time: string): string | undefined {
  const dateMatch = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(date);
  const timeMatch = /^(\d{2}):(\d{2})/.exec(time.trim());
  if (!dateMatch || !timeMatch) {
    return undefined;
  }

  const [, day, month, year] = dateMatch;
  const [, hours, minutes] = timeMatch;
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Gets the current date and time in a specific time zone.
 */
export function getCurrentZonedDateTime(timeZone = 'Europe/Zurich'): Temporal.ZonedDateTime {
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
  end2: T,
): {
  start: T;
  end: T
} | null
{
  const compare = (a: unknown, b: unknown): ComparisonResult => {
    if (a instanceof Temporal.PlainDateTime && b instanceof Temporal.PlainDateTime) {
      return Temporal.PlainDateTime.compare(a, b);
    }
    if (a instanceof Temporal.ZonedDateTime && b instanceof Temporal.ZonedDateTime) {
      return Temporal.ZonedDateTime.compare(a, b);
    }
    throw new Error('Cannot compare different Temporal types or non-Temporal types');
  };

  const start = compare(start1, start2) > 0 ? start1 : start2;
  const end = compare(end1, end2) < 0 ? end1 : end2;

  if (compare(start, end) < 0) {
    return {start, end};
  }
  return null;
}

/**
 * Calculates the intersection of two DateTimeRanges.
 */
export function intersectDateTimeRanges(
  range1: DateTimeRange,
  range2: DateTimeRange,
): DateTimeRange | null {
  const intersection = intersectRanges(range1.start, range1.end, range2.start, range2.end);
  return intersection;
}

