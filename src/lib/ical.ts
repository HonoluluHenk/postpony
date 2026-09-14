import type { AppLocale } from '../locales';
import { CLASH_BUFFER_HOURS } from './clashes';
import type { Postponement, ProposedDate, Team, Venue, Vote } from './models';
import { PostponementRules } from './postponement';
import { formatIsoToLocaleTokens, parseIsoToPlainDateTime } from './temporal-utils';
import { resolveVenue } from './venues';

/**
 * The iCal export module: a pure function turning a Postponement into an RFC
 * 5545 `text/calendar` string. One VEVENT per currently votable Proposed Date;
 * the confirmed date is marked CONFIRMED, everything else TENTATIVE. No I/O —
 * handlers load the session, run the guard, and call `buildIcal`.
 */
export const ICAL_PRODUCT_ID = '-//PostPony//PostPony//EN';

/** Localized labels for the per-date Vote links, resolved by the caller so the builder stays pure and I/O-free. */
export interface IcalVoteLabels {
  /** Line label before the choice links, e.g. "Vote". */
  action: string;
  yes: string;
  ifNecessary: string;
  no: string;
}

/**
 * Pretty anchor texts for the HTML links in the `X-ALT-DESC` rendition.
 * Resolved by the caller so the builder stays locale-neutral. The vote anchors
 * are join-export only and fall back to the short vote label / raw value when
 * absent.
 */
export interface IcalLinkLabels {
  /** Anchor text for the poll/edit page link. */
  open: string;
  yes?: string;
  ifNecessary?: string;
  no?: string;
}

export interface IcalBuildOptions {
  baseUrl: string;
  locale: AppLocale;
  /** Clock seam for DTSTAMP; defaults to the current time. */
  now?: Date;
  /** Invitation password. When present together with `team` and `labels` the export is a token-gated join export and gains `URL:` plus per-date Vote links; the public edit export omits them and stays byte-identical. */
  token?: string;
  /** Team whose poll the embedded links target; required with `token`. */
  team?: Team;
  /** Participant id embedded in every link; absent → unpersonalized links. */
  playerId?: string;
  /** Localized choice labels; required with `token`. */
  labels?: IcalVoteLabels;
  /** Pretty anchor texts for the `X-ALT-DESC` HTML links; absent → raw URLs as anchors. */
  linkLabels?: IcalLinkLabels;
}

interface VoteContext {
  token: string;
  team: Team;
  /** '' when unpersonalized. */
  playerId: string;
  labels: IcalVoteLabels;
}

export function buildIcal(session: Postponement, options: IcalBuildOptions): string {
  const rules = new PostponementRules();
  const dates = rules.votableDates(session);
  const now = options.now ?? new Date();
  // Join mode needs token + team + labels together; a partial state (e.g. a
  // handler forgetting labels) drops Vote emission rather than half-emitting.
  const vote = options.token && options.team && options.labels
               ? {token: options.token, team: options.team, playerId: options.playerId ?? '', labels: options.labels}
               : undefined;

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${ICAL_PRODUCT_ID}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(session.name)}`,
    ...dates.flatMap((date) => eventLines(session, date, now, options, vote)),
    'END:VCALENDAR',
  ];

  return `${lines.map(foldLine)
    .join('\r\n')}\r\n`;
}

function eventLines(
  session: Postponement,
  date: ProposedDate,
  now: Date,
  options: IcalBuildOptions,
  vote: VoteContext | undefined,
): string[] {
  const start = parseIsoToPlainDateTime(date.dateTimeRange.start);
  const end = start.add({hours: CLASH_BUFFER_HOURS});
  const venue = resolveVenue(date.venueNumber, session.venues);
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
  if (vote) {
    lines.push(`URL:${pollUrl(session, options.baseUrl, vote)}`);
  }
  lines.push(
    `DESCRIPTION:${escapeText(description(session, options, vote, date))}`,
    `X-ALT-DESC;FMTTYPE=text/html:${htmlDescription(session, options, vote, date, options.linkLabels)}`,
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

function description(
  session: Postponement,
  options: IcalBuildOptions,
  vote: VoteContext | undefined,
  date: ProposedDate,
): string {
  const originalMatch = session.originalMatchDateTime
                        ? formatIsoToLocaleTokens(session.originalMatchDateTime, options.locale)
                        : '';
  const lines = [
    `Original match: ${originalMatch}`,
    `${options.baseUrl}/edit/${session.id}`,
  ];
  if (vote) {
    lines.push(`${vote.labels.action}:`);
    for (const [value, label] of [
      ['Yes', vote.labels.yes],
      ['IfNecessary', vote.labels.ifNecessary],
      ['No', vote.labels.no],
    ] as const)
    {
      lines.push(`${label} ${voteUrl(session, options.baseUrl, vote, date, value)}`);
    }
  }
  return lines.join('\n');
}

/**
 * The `X-ALT-DESC` value: the DESCRIPTION as rich HTML (RFC 7986) with
 * clickable links, so calendar apps render it readably. Mirrors the plain text
 * line-for-line; `&` in hrefs is entity-escaped.
 */
function htmlDescription(
  session: Postponement,
  options: IcalBuildOptions,
  vote: VoteContext | undefined,
  date: ProposedDate,
  linkLabels: IcalLinkLabels | undefined,
): string {
  const parts: string[] = [];
  if (session.originalMatchDateTime) {
    const original = formatIsoToLocaleTokens(session.originalMatchDateTime, options.locale);
    parts.push(`<b>Original match: ${escapeHtml(original)}</b>`);
  }
  const pollHref = vote ? pollUrl(session, options.baseUrl, vote) : `${options.baseUrl}/edit/${session.id}`;
  parts.push(`<a href="${escapeHtml(pollHref)}">${escapeHtml(linkLabels?.open ?? pollHref)}</a>`);
  if (vote) {
    parts.push(`<b>${escapeHtml(vote.labels.action)}:</b>`);
    const items: string[] = [];
    for (const [value, key] of [
      ['Yes', 'yes'],
      ['IfNecessary', 'ifNecessary'],
      ['No', 'no'],
    ] as const)
    {
      const anchor = linkLabels?.[key] ?? value;
      items.push(`<li><a href="${escapeHtml(voteUrl(session, options.baseUrl, vote, date, value))}">${escapeHtml(anchor)}</a></li>`);
    }
    parts.push(`<ul>${items.join('')}</ul>`);
  }
  return parts.join('<br>');
}

/** HTML-escapes a string destined for an attribute or text node. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** The choice-less poll URL behind the calendar app's "Open URL" button. */
function pollUrl(session: Postponement, baseUrl: string, vote: VoteContext): string {
  return `${baseUrl}/join/${session.id}/${vote.team}/vote?token=${encodeURIComponent(vote.token)}${playerParam(vote)}`;
}

/** One Date's one-click Vote link for a given choice value. */
function voteUrl(
  session: Postponement,
  baseUrl: string,
  vote: VoteContext,
  date: ProposedDate,
  value: Vote['type'],
): string {
  return `${baseUrl}/join/${session.id}/${vote.team}/vote?token=${encodeURIComponent(vote.token)}`
    + `${playerParam(vote)}&vote-${encodeURIComponent(date.id)}=${value}`;
}

function playerParam(vote: VoteContext): string {
  return vote.playerId ? `&playerId=${encodeURIComponent(vote.playerId)}` : '';
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

const pad2 = (value: number): string => String(value)
  .padStart(2, '0');

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
