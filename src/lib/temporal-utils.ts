import { Temporal } from '@js-temporal/polyfill';
import type { AppLocale } from '../locales';
import { defaultLocale, localeConfig } from '../locales';
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
  locale: AppLocale = defaultLocale,
  options: Intl.DateTimeFormatOptions = {
    dateStyle: 'medium',
    timeStyle: 'short',
  },
): string {
  return dateTime.toLocaleString(localeConfig(locale).intlTag, options);
}

/**
 * Parses an ISO string into a PlainDateTime.
 */
export function parseIsoToPlainDateTime(isoString: string): Temporal.PlainDateTime {
  return Temporal.PlainDateTime.from(isoString);
}

/**
 * Parses a user-typed datetime in the locale's input format into a
 * PlainDateTime. Tolerant: leading zeros are optional, `.` `/` `-` are all
 * accepted as date separators, and the en-US `am`/`pm` marker is case
 * insensitive with optional surrounding whitespace. The 12-hour clock never
 * guesses: an en-US time without an am/pm marker is rejected, as is any time
 * that falls outside the locale's clock (e.g. `20:00 pm`). Returns undefined
 * for anything unparseable instead of throwing.
 */
export function parseLocaleDateTime(value: string, locale: AppLocale): Temporal.PlainDateTime | undefined {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return undefined;
  }
  const config = localeConfig(locale);
  const match = config.clock24
                ? DATE_TIME_24H_PATTERN.exec(trimmed)
                : DATE_TIME_12H_PATTERN.exec(trimmed);
  if (!match) {
    return undefined;
  }
  const [, first = '', , second = '', year = '', hour = '', minute = '', marker] = match;
  const day = config.dayFirst ? first : second;
  const month = config.dayFirst ? second : first;
  let hours = Number(hour);
  if (!config.clock24) {
    if (hours < 1 || hours > 12) {
      return undefined;
    }
    const isPm = marker?.toLowerCase() === 'pm';
    if (hours === 12) {
      hours = isPm ? 12 : 0;
    } else if (isPm) {
      hours += 12;
    }
  }
  // Building a strict ISO string (rather than the object form) lets
  // `PlainDateTime.from` reject impossible values (2026-02-30, hour 24, ...)
  // with a RangeError, which we surface as `undefined`.
  const iso = `${year}-${pad2(month)}-${pad2(day)}T${pad2(hours)}:${pad2(minute)}`;
  try {
    return Temporal.PlainDateTime.from(iso);
  } catch {
    return undefined;
  }
}

// Matches `dd.MM.yyyy HH:mm` (24h locales), day and month in either order
// depending on dayFirst. Backreference \2 keeps the two date separators
// consistent (no `02.08/2026` mixes).
const DATE_TIME_24H_PATTERN = /^(\d{1,2})([./-])(\d{1,2})\2(\d{4})\s+(\d{1,2}):(\d{1,2})$/;
// Matches `MM/dd/yyyy hh:mm aa` (12h en-US): the am/pm marker is required.
const DATE_TIME_12H_PATTERN = /^(\d{1,2})([./-])(\d{1,2})\2(\d{4})\s+(\d{1,2}):(\d{1,2})\s*(am|pm)$/i;

const pad2 = (value: number | string): string => String(value)
  .padStart(2, '0');

/**
 * Formats a stored ISO datetime string (which may carry second precision,
 * e.g. `2026-08-02T20:00:00`) into the locale's input-format tokens at minute
 * precision, e.g. `02.08.2026 20:00` or `08/02/2026 08:00 pm`.
 */
export function formatIsoToLocaleTokens(isoString: string, locale: AppLocale): string {
  const dateTime = parseIsoToPlainDateTime(isoString);
  const config = localeConfig(locale);
  const datePart = config.dateFormat
    .replace('yyyy', String(dateTime.year))
    .replace('dd', pad2(dateTime.day))
    .replace('MM', pad2(dateTime.month));
  const hours = config.clock24 ? dateTime.hour : dateTime.hour % 12 || 12;
  const timePart = config.timeFormat
    .replace('HH', pad2(dateTime.hour))
    .replace('hh', pad2(hours))
    .replace('mm', pad2(dateTime.minute))
    .replace('aa', dateTime.hour < 12 ? 'am' : 'pm');
  return `${datePart} ${timePart}`;
}

/**
 * Parses a user-typed time-of-day in the locale's input format into
 * `{ hour, minute }`. Mirrors `parseLocaleDateTime`'s grammar but for the
 * time portion only: 24h locales accept `HH:mm` (optional seconds are
 * accepted and ignored), 12h locales require `hh:mm aa` with a
 * case-insensitive `am`/`pm` marker. Missing `am`/`pm` in 12h locales and
 * hour/minute out of range are both rejected. Returns undefined instead of
 * throwing.
 */
export interface LocaleTime {
  hour: number;
  minute: number;
}

export function parseLocaleTimeOnly(value: string, locale: AppLocale): LocaleTime | undefined {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return undefined;
  }
  const config = localeConfig(locale);
  const match = config.clock24
                ? TIME_24H_PATTERN.exec(trimmed)
                : TIME_12H_PATTERN.exec(trimmed);
  if (!match) {
    return undefined;
  }
  const [, hour = '', minute = '', marker] = match;
  let hours = Number(hour);
  const minutes = Number(minute);
  if (!config.clock24) {
    if (hours < 1 || hours > 12) {
      return undefined;
    }
    const isPm = marker?.toLowerCase() === 'pm';
    if (hours === 12) {
      hours = isPm ? 12 : 0;
    } else if (isPm) {
      hours += 12;
    }
  }
  // Round-trip through the strict ISO time representation so impossible
  // values (hour ≥ 24, minute ≥ 60) are rejected without throwing — mirrors
  // the existing `parseLocaleDateTime` strategy in this file.
  const iso = `${pad2(hours)}:${pad2(minutes)}`;
  try {
    Temporal.PlainTime.from(iso);
  }
  catch {
    return undefined;
  }
  return {hour: hours, minute: minutes};
}

// Matches `HH:mm` with optional trailing `:ss` (24h locales). Seconds are
// parsed (named group exists) but ignored by `parseLocaleTimeOnly`.
const TIME_24H_PATTERN = /^(\d{1,2}):(\d{1,2})(?::\d{1,2})?$/;
// Matches `hh:mm aa` with optional `:ss` (12h en-US); the am/pm marker is required.
const TIME_12H_PATTERN = /^(\d{1,2}):(\d{1,2})(?::\d{1,2})?\s*(am|pm)$/i;

/**
 * Converts a click-tt.ch match's `date` (`dd.mm.yyyy`) and `time` (`HH:mm`,
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

