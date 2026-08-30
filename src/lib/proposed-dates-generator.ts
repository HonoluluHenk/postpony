import { Temporal } from '@js-temporal/polyfill';

/** Maximum number of weeks the planning window extends forward from the
 *  original match date. Exported so callers can derive the same boundary
 *  without hardcoding a magic number. */
export const MAX_FORWARD_WEEKS_FROM_ORIGINAL = 4;

/** Maximum number of (weekday, hh, mm) tuples processed per call. Exported so
 *  the handler and the section re-use one cap value rather than mirror a
 *  literal. The server's enforcement is the security-relevant check; this is
 *  the spec-aligned contract. */
export const MAX_TUPLES = 14;

/**
 * A (weekday, hour, minute) pattern the planner walks over the planning window.
 * `weekday` uses the Temporal/ISO convention: 1=Monday .. 7=Sunday.
 */
export interface ProposedDateTuple {
  weekday: number;
  hour: number;
  minute: number;
}

export interface GenerateProposedDatesInput {
  /** Explicit planning window start (ISO string). */
  fromIso: string;
  /** Explicit planning window end (ISO string). */
  toIso: string;
  /** Caller-supplied "now" so the module has no hidden clock. */
  todayIso: string;
  /** Up to 14 tuples are processed; the rest are dropped silently. */
  tuples: readonly ProposedDateTuple[];
  /** Existing dedup keys to compare candidates against at minute precision. A
   *  key is either a plain ISO start or a composite `"<start>|<venue>"` string
   *  (the handler's venue-aware seam); the venue suffix is treated opaquely —
   *  only the start portion is compared. */
  existingStarts: readonly string[];
}

export interface GenerateProposedDatesResult {
  /** ISO datetimes to add, in iteration order. Past and duplicate candidates are excluded. */
  added: string[];
  /** Count of candidates that matched `existingStarts` and were silently dropped. */
  skipped: number;
}

/**
 * Pure: walks a planning window for each (weekday, hh, mm) tuple and returns the
 * ISO datetimes that should be added plus a count silently skipped due to dedupe
 * against `existingStarts`.
 *
 * Window: `[max(today, fromIso), toIso]` in 7-day strides per tuple. The
 * strict-ISO round-trip rejects calendar impossibles (out-of-range hour/minute,
 * Feb 30, ...) without crashing the loop — see `temporal-utils.ts:91-94`.
 *
 * ponytail: pure module is timezone-naive, so `PlainDateTime.from` cannot detect
 * DST zones (e.g. Sun 02:30 round-trips fine). DST narrowing happens at the
 * handler boundary; this module only filters calendar impossibles.
 */
export function generateProposedDates(input: GenerateProposedDatesInput): GenerateProposedDatesResult {
  const {fromIso, toIso, todayIso, existingStarts} = input;
  // ponytail: server enforces the canonical cap of 14; this matches the spec-aligned contract.
  const tuples = input.tuples.slice(0, MAX_TUPLES);

  const today = Temporal.PlainDateTime.from(todayIso);
  const from = Temporal.PlainDateTime.from(fromIso);
  const to = Temporal.PlainDateTime.from(toIso);

  const lower = Temporal.PlainDateTime.compare(today, from) > 0 ? today : from;
  const upper = to;

  const existingSet = new Set(existingStarts.map(canonicalExistingKey));

  const added: string[] = [];
  let skipped = 0;

  for (const tuple of tuples) {
    const first = firstCandidateOnOrAfter(lower, upper, tuple);
    if (first === undefined) {
      // ponytail: silent skip for impossible tuples (out-of-range hour/minute,
      // Feb-style impossibilities surfaced by strict-ISO round-trip). Not counted
      // toward `skipped`; that counter is reserved for dedupe vs existingStarts.
      continue;
    }

    let cursor = first;
    while (Temporal.PlainDateTime.compare(cursor, upper) <= 0) {
      const key = cursor.toString({smallestUnit: 'minutes'});
      if (isExistingDuplicate(existingSet, key)) {
        skipped++;
      } else if (Temporal.PlainDateTime.compare(cursor, today) > 0) {
        added.push(key);
      }
      cursor = cursor.add({days: 7});
    }
  }

  return {added, skipped};
}

function firstCandidateOnOrAfter(
  lower: Temporal.PlainDateTime,
  upper: Temporal.PlainDateTime,
  tuple: ProposedDateTuple,
): Temporal.PlainDateTime | undefined {
  const diff = (tuple.weekday - lower.dayOfWeek + 7) % 7;
  const date = lower.add({days: diff});
  if (Temporal.PlainDateTime.compare(date, upper) > 0) {
    return undefined;
  }
  // Build the strict ISO at minute precision so the round-trip rejects
  // impossible values (hour ≥ 24, minute ≥ 60, ...); mirrors temporal-utils.ts:91-94.
  const iso = `${pad(date.year, 4)}-${pad(date.month, 2)}-${pad(date.day, 2)}T${pad(tuple.hour, 2)}:${pad(tuple.minute, 2)}`;
  try {
    return Temporal.PlainDateTime.from(iso);
  }
  catch {
    return undefined;
  }
}

function canonicalMinuteKey(iso: string): string {
  return Temporal.PlainDateTime.from(iso).toString({smallestUnit: 'minutes'});
}

/**
 * Canonicalizes an existing dedup key to minute precision. Composite keys
 * (`"<start>|<venue>"`) from the handler's venue-aware seam keep their venue
 * suffix; plain ISO starts canonicalize exactly as before.
 */
function canonicalExistingKey(key: string): string {
  const separator = key.indexOf('|');
  if (separator === -1) {
    return canonicalMinuteKey(key);
  }
  return `${canonicalMinuteKey(key.slice(0, separator))}${key.slice(separator)}`;
}

/**
 * A candidate matches an existing key either exactly (plain ISO starts) or as
 * the start portion of a composite `"<start>|<venue>"` key.
 * ponytail: O(n) scan per candidate over the existing set; the planning window
 * yields at most a few dozen candidates, so a prefix index is not worth it.
 */
function isExistingDuplicate(existingSet: Set<string>, candidateKey: string): boolean {
  if (existingSet.has(candidateKey)) {
    return true;
  }
  const prefix = `${candidateKey}|`;
  for (const existing of existingSet) {
    if (existing.startsWith(prefix)) {
      return true;
    }
  }
  return false;
}

function pad(value: number, width: number): string {
  return String(value).padStart(width, '0');
}
