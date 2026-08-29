import { Temporal } from '@js-temporal/polyfill';

/** Maximum number of (weekday, hh, mm) tuples processed per call. Exported so
 *  the handler and the section re-use one cap value rather than mirror a
 *  literal. The server's enforcement is the security-relevant check; this is
 *  the spec-aligned contract. */
export const MAX_TUPLES = 14;

const BACKWARD_WEEKS = 8;
const FORWARD_WEEKS = 4;

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
  /**
   * Anchor datetime (typically the postponed match's `originalMatchDateTime`).
   * When undefined the window collapses to `[today, today + 4 weeks]`.
   */
  anchorIso: string | undefined;
  /** Caller-supplied "now" so the module has no hidden clock. */
  todayIso: string;
  /** Up to 14 tuples are processed; the rest are dropped silently. */
  tuples: readonly ProposedDateTuple[];
  /** Existing proposed-date starts to dedupe against at minute precision. */
  existingStarts: readonly string[];
}

export interface GenerateProposedDatesResult {
  /** ISO datetimes to add, in iteration order. Past and duplicate candidates are excluded. */
  added: string[];
  /** Count of candidates that matched `existingStarts` and were silently dropped. */
  skipped: number;
  /** True when `anchorIso` was undefined and the window collapsed to `[today, today + 4 weeks]`. */
  usedFallbackWindow: boolean;
}

/**
 * Pure: walks a planning window for each (weekday, hh, mm) tuple and returns the
 * ISO datetimes that should be added plus a count silently skipped due to dedupe
 * against `existingStarts`.
 *
 * Window: `[max(today, anchor - 8 weeks), anchor + 4 weeks]` in 7-day strides per
 * tuple. Anchor undefined falls back to `[today, today + 4 weeks]`. The
 * strict-ISO round-trip rejects calendar impossibles (out-of-range hour/minute,
 * Feb 30, ...) without crashing the loop — see `temporal-utils.ts:91-94`.
 *
 * ponytail: pure module is timezone-naive, so `PlainDateTime.from` cannot detect
 * DST zones (e.g. Sun 02:30 round-trips fine). DST narrowing happens at the
 * handler boundary; this module only filters calendar impossibles.
 */
export function generateProposedDates(input: GenerateProposedDatesInput): GenerateProposedDatesResult {
  const {anchorIso, todayIso, existingStarts} = input;
  // ponytail: server enforces the canonical cap of 14; this matches the spec-aligned contract.
  const tuples = input.tuples.slice(0, MAX_TUPLES);

  const today = Temporal.PlainDateTime.from(todayIso);

  let lower: Temporal.PlainDateTime;
  let upper: Temporal.PlainDateTime;
  let usedFallbackWindow = false;

  if (anchorIso === undefined) {
    lower = today;
    upper = today.add({weeks: FORWARD_WEEKS});
    usedFallbackWindow = true;
  } else {
    const anchor = Temporal.PlainDateTime.from(anchorIso);
    const back = anchor.subtract({weeks: BACKWARD_WEEKS});
    lower = Temporal.PlainDateTime.compare(today, back) > 0 ? today : back;
    upper = anchor.add({weeks: FORWARD_WEEKS});
  }

  const existingSet = new Set(existingStarts.map(canonicalMinuteKey));

  const added: string[] = [];
  let skipped = 0;

  for (const tuple of tuples) {
    const first = firstCandidateOnOrAfter(lower, upper, tuple);
    if (first === undefined) {
      // ponytail: silent skip for impossible tuples (out-of-range hour/minute,
      // Feb-style impossibles surfaced by strict-ISO round-trip). Not counted
      // toward `skipped`; that counter is reserved for dedupe vs existingStarts.
      continue;
    }

    let cursor = first;
    while (Temporal.PlainDateTime.compare(cursor, upper) <= 0) {
      const key = cursor.toString({smallestUnit: 'minutes'});
      if (existingSet.has(key)) {
        skipped++;
      } else if (Temporal.PlainDateTime.compare(cursor, today) > 0) {
        added.push(key);
      }
      cursor = cursor.add({days: 7});
    }
  }

  return {added, skipped, usedFallbackWindow};
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

function pad(value: number, width: number): string {
  return String(value).padStart(width, '0');
}
