import type { AppLocale } from '../locales';
import { CLASH_BUFFER_HOURS } from './clashes';
import type { Postponement, ProposedDate, Venue } from './models';
import { PostponementRules } from './postponement';
import { formatIsoToLocaleTokens, parseIsoToPlainDateTime } from './temporal-utils';

/**
 * The iCal export module: a pure function turning a Postponement into an RFC
 * 5545 `text/calendar` string. One VEVENT per currently votable Proposed Date;
 * the confirmed date is marked CONFIRMED, everything else TENTATIVE. No I/O —
 * handlers load the session, run the guard, and call `buildIcal`.
 */
export const ICAL_PRODUCT_ID = '-//PostPony//PostPony//EN';

export interface IcalBuildOptions {
  baseUrl: string;
  locale: AppLocale;
  /** Clock seam for DTSTAMP; defaults to the current time. */
  now?: Date;
}

export function buildIcal(session: Postponement, options: IcalBuildOptions): string {
  const rules = new PostponementRules();
  const dates = rules.votableDates(session);
  const now = options.now ?? new Date();

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${ICAL_PRODUCT_ID}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(session.name)}`,
    ...dates.flatMap((date) => eventLines(session, date, now, options)),
    'END:VCALENDAR',
  ];

  return `${lines.map(foldLine).join('\r\n')}\r\n`;
}

function eventLines(
  session: Postponement,
  date: ProposedDate,
  now: Date,
  options: IcalBuildOptions,
): string[] {
  const start = parseIsoToPlainDateTime(date.dateTimeRange.start);
  const end = start.add({hours: CLASH_BUFFER_HOURS});
  const venue = resolveVenue(session, date.venueNumber);
  // CONFIRMED only while the session is actually locked: after a reopen the
  // formerly-confirmed date is votable again and exports as TENTATIVE.
  const confirmed = session.status === 'Confirmed' && session.confirmedProposedDateId === date.id;

  const lines = [
    'BEGIN:VEVENT',
    `UID:${date.id}@postpony`,
    `DTSTAMP:${formatUtcStamp(now)}`,
    `DTSTART;TZID=Europe/Zurich:${formatPlainDateTime(start)}`,
    `DTEND;TZID=Europe/Zurich:${formatPlainDateTime(end)}`,
    `SUMMARY:${escapeText(summary(session))}`,
  ];
  if (venue) {
    lines.push(`LOCATION:${escapeText(venueLine(venue))}`);
  }
  lines.push(
    `DESCRIPTION:${escapeText(description(session, options))}`,
    `STATUS:${confirmed ? 'CONFIRMED' : 'TENTATIVE'}`,
    'END:VEVENT',
  );
  return lines;
}

function summary(session: Postponement): string {
  const home = session.homeTeam ?? '';
  const guest = session.guestTeam ?? '';
  return `Verschiebung: ${session.name} (${home} vs ${guest})`;
}

function description(session: Postponement, options: IcalBuildOptions): string {
  const originalMatch = session.originalMatchDateTime
                        ? formatIsoToLocaleTokens(session.originalMatchDateTime, options.locale)
                        : '';
  return `Original match: ${originalMatch}\n${options.baseUrl}/edit/${session.id}`;
}

function resolveVenue(session: Postponement, venueNumber: number | undefined): Venue | undefined {
  return session.venues.find((v) => v.venueNumber === (venueNumber ?? 1));
}

function venueLine(venue: Venue): string {
  return `${venue.name}, ${venue.address}, ${venue.postalCode} ${venue.city}`;
}

function formatPlainDateTime(dateTime: ReturnType<typeof parseIsoToPlainDateTime>): string {
  return `${dateTime.year}${pad2(dateTime.month)}${pad2(dateTime.day)}`
    + `T${pad2(dateTime.hour)}${pad2(dateTime.minute)}${pad2(dateTime.second)}`;
}

function formatUtcStamp(date: Date): string {
  return `${date.getUTCFullYear()}${pad2(date.getUTCMonth() + 1)}${pad2(date.getUTCDate())}`
    + `T${pad2(date.getUTCHours())}${pad2(date.getUTCMinutes())}${pad2(date.getUTCSeconds())}Z`;
}

const pad2 = (value: number): string => String(value).padStart(2, '0');

/**
 * RFC 5545 text escaping: backslash, semicolon, comma and newlines. Backslash
 * first so the other replacements never double-escape it.
 */
function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n/g, '\\n');
}

/**
 * Folds a content line so every physical line is at most 75 octets (RFC 5545),
 * continuing with CRLF followed by a single space. Splits at character
 * boundaries so multi-byte UTF-8 characters are never cut in half.
 */
function foldLine(line: string): string {
  const MAX_OCTETS = 75;
  const encoder = new TextEncoder();
  const segments: string[] = [];
  let current = '';
  let octets = 0;
  for (const char of line) {
    const charOctets = encoder.encode(char).length;
    if (current.length > 0 && octets + charOctets > MAX_OCTETS) {
      segments.push(current);
      current = ` ${char}`;
      octets = 1 + charOctets;
    } else {
      current += char;
      octets += charOctets;
    }
  }
  if (current.length > 0) {
    segments.push(current);
  }
  return segments.join('\r\n');
}

/**
 * Derives a safe `.ics` download filename from a match name: keeps only a
 * conservative ASCII set (letters, digits, space, `.`, `_`, `-`) so the value is
 * always a valid Content-Disposition filename — a non-ASCII char such as the
 * en-dash a derived match name carries would otherwise trip Node's header
 * validation. CR/LF collapse to a space and a blank/unsafe-only name falls back
 * to a placeholder. `session.name` is the caller's input.
 */
export function icalFilename(matchName: string): string {
  const stem = matchName
    .replace(/[\r\n]+/g, ' ')
    .replace(/[^A-Za-z0-9 ._-]/g, '_')
    .replace(/ +/g, ' ')
    .trim();
  const hasContent = stem.replace(/[ _]/g, '').length > 0;
  return `${hasContent ? stem : 'postponement'}.ics`;
}

/** The response headers a calendar download endpoint returns. */
export function icalResponseHeaders(filename: string): Record<string, string> {
  return {
    'Content-Type': 'text/calendar; charset=utf-8',
    'Content-Disposition': `attachment; filename="${filename}"`,
  };
}