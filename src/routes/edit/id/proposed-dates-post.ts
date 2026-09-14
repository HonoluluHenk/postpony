import * as v from 'valibot';
import type { App } from '../../../app';
import { applyClashCheckResult } from '../../../lib/clashes';
import { MAX_TUPLES, MAX_FORWARD_WEEKS_FROM_ORIGINAL, generateProposedDates, type ProposedDateTuple } from '../../../lib/proposed-dates-generator';
import { mapValidationToErrors } from '../../../lib/map-validation-to-errors';
import {
  formatIsoToDateOnlyLocaleTokens,
  nowPlainDateTimeIso,
  parseLocaleDateOnly,
  parseLocaleDateTime,
  parseLocaleTimeOnly,
} from '../../../lib/temporal-utils';
import type { Postponement, Venue } from '../../../lib/models';
import { Temporal } from '@js-temporal/polyfill';
import { type EditPartialExtras, renderEditPartials } from './render-edit-partials';
import { runEditCommand } from './run-edit-command';
import { computeClashesForSession } from './clash-check';
import { FALLBACK_VENUE_COUNT } from './proposed-dates-section';

const TUPLE_DISCRIMINATOR = 'tuple';

/**
 * Locale-token defaults for the generator's From/To fields: today and
 * today+4w, or (when an anchor exists) the original match + 4 weeks. Mirrors
 * the edit-page GET prefill so every partial re-render of the generator keeps
 * a populated (never empty) range.
 */
export function defaultGeneratorDateRange(
  locale: App['locale'],
  originalMatchDateTime: string | undefined,
): {fromDate: string; toDate: string} {
  const todayDate = Temporal.PlainDate.from(nowPlainDateTimeIso());
  const fromDate = formatIsoToDateOnlyLocaleTokens(todayDate.toString(), locale);
  const toDateRaw = originalMatchDateTime !== undefined
    ? Temporal.PlainDate.from(originalMatchDateTime).add({weeks: MAX_FORWARD_WEEKS_FROM_ORIGINAL})
    : todayDate.add({weeks: MAX_FORWARD_WEEKS_FROM_ORIGINAL});
  const toDate = formatIsoToDateOnlyLocaleTokens(toDateRaw.toString(), locale);
  return {fromDate, toDate};
}

function organizerQuery(app: App): string {
  return app.query('organizerPassword') ?? '';
}

function redirectAfterEdit(app: App, session: Postponement): Response {
  return app.redirect(`/edit/${session.id}?organizerPassword=${organizerQuery(app)}`);
}

interface ParsedTuples {
  tuples: ProposedDateTuple[];
  invalidRowIndex: number | undefined;
}

/**
 * Maps the submitted `time[]` values to (weekday, hour, minute) tuples. The
 * weekday is always the row index + 1 in the fixed Monday–Sunday grid — the
 * server never trusts a client-supplied weekday. An empty string is skipped at
 * this parse boundary; a non-empty string that fails the locale grammar marks
 * that row's index as invalid.
 */
function parseTupleTimes(times: readonly string[], locale: App['locale']): ParsedTuples {
  const tuples: ProposedDateTuple[] = [];
  for (const [index, rawTime] of times.entries()) {
    if (rawTime.trim().length === 0) {
      continue;
    }
    const parsed = parseLocaleTimeOnly(rawTime, locale);
    if (parsed === undefined) {
      return {tuples: [], invalidRowIndex: index};
    }
    tuples.push({weekday: index + 1, hour: parsed.hour, minute: parsed.minute});
  }
  return {tuples, invalidRowIndex: undefined};
}

interface SingleDateOutput {
  proposedDateTime: string;
  venueNumber?: number;
}

/**
 * Upper bound for the single-date venue dropdown. Known venues bound the range to
 * `1..venues.length`; without scraped venues the organizer can still pick `1..10`.
 */
function maxVenueNumber(venues: readonly Venue[]): number {
  return venues.length > 0 ? venues.length : FALLBACK_VENUE_COUNT;
}
interface TupleOutput {
  generate: typeof TUPLE_DISCRIMINATOR;
  'time[]': string[];
  fromDate: string;
  toDate: string;
  venueNumber?: number;
  proposedDateTime?: never;
}

/**
 * Shared From/To date-only field schema: required, parsed under the rendering
 * locale so `dd.MM.yyyy` (CH) or `MM/dd/yyyy` (en-US) submissions are
 * deterministic (ADR-0016). An empty value is a required error surfaced on the
 * offending field; a non-empty value that fails the locale grammar keeps the
 * generic invalid-datetime message. The transformed output is the ISO date.
 */
function dateOnlyFieldSchema(app: App): v.BaseSchema<unknown, string, v.BaseIssue<unknown>> {
  const requiredMsg = app.t('proposed_dates_generate_date_required');
  const invalidMsg = app.t('proposed_date_time_invalid');
  return v.pipe(
    v.string(requiredMsg),
    // Required: an empty (or missing) value is a required error. Guarded so
    // the two checks stay mutually exclusive — mapValidationToErrors keeps the
    // last issue, so a required failure must not also emit a parse issue.
    v.check((val: string): boolean => val.length > 0, requiredMsg),
    v.check(
      (val: string): boolean => val.length === 0 || parseLocaleDateOnly(val, app.locale) !== undefined,
      invalidMsg,
    ),
    // ponytail: `?? ''` avoids a non-null assertion; the check above guarantees defined.
    v.transform((val: string): string => parseLocaleDateOnly(val, app.locale) ?? ''),
  );
}

/**
 * Shared venue-number field for the single-date and generator schemas: absent
 * means legacy venue 1; present it must be an integer within `1..venues.length`
 * (or `1..FALLBACK_VENUE_COUNT` when no venues are scraped).
 */
function venueNumberSchema(app: App, venues: readonly Venue[]): v.BaseSchema<unknown, number | undefined, v.BaseIssue<unknown>> {
  return v.optional(
    v.pipe(
      v.string(),
      v.check((val: string): boolean => {
        const n = Number(val);
        return Number.isInteger(n) && n >= 1 && n <= maxVenueNumber(venues);
      }, app.t('proposed_date_venue_invalid')),
      v.transform((val: string): number => Number(val)),
    ),
  );
}

function buildTupleSchema(app: App, venues: readonly Venue[]): v.BaseSchema<unknown, TupleOutput, v.BaseIssue<unknown>> {
  return v.object({
    generate: v.literal(TUPLE_DISCRIMINATOR, app.t('proposed_date_time_invalid')),
    'time[]': v.array(v.string()),
    fromDate: dateOnlyFieldSchema(app),
    toDate: dateOnlyFieldSchema(app),
    venueNumber: venueNumberSchema(app, venues),
    // ponytail: rogue POST combining the generator branch with the single-date
    // field is explicitly rejected. The schema encodes it via the `never`
    // output type — passing `proposedDateTime` makes the parse fail before
    // any persistence happens.
    proposedDateTime: v.optional(v.never(app.t('proposed_date_time_invalid'))),
  });
}

function buildSingleDateSchema(app: App, venues: readonly Venue[]): v.BaseSchema<unknown, SingleDateOutput, v.BaseIssue<unknown>> {
  return v.object({
    proposedDateTime: v.pipe(
      v.string(),
      v.check((val: string): boolean => parseLocaleDateTime(val, app.locale) !==
        undefined, app.t('proposed_date_time_invalid')),
    ),
    venueNumber: venueNumberSchema(app, venues),
  });
}

export const handleEditProposedDatesPost = async (app: App): Promise<Response> => {
  const id = app.requireParam('id');
  const values = await app.body({all: true}) as Record<string, unknown>;

  if (values['generate'] === TUPLE_DISCRIMINATOR) {
    return handleTupleSubmit(app, id, values);
  }

  return handleSingleSubmit(app, id, values);
};

/**
 * Fetches a fresh clash check and applies the pure session rule: attach the
 * snapshot and auto-deselect the newly added clashing dates. A failed check
 * (undefined) leaves the session unchanged — the dates are saved clash-free.
 */
async function withClashCheck(
  session: Postponement,
  addedIds: readonly string[],
): Promise<Postponement> {
  const checkResult = await computeClashesForSession(session);
  if (checkResult === undefined) {
    return session;
  }
  return applyClashCheckResult(session, checkResult, addedIds);
}

function handleTupleSubmit(
  app: App,
  id: string,
  values: Record<string, unknown>,
): Promise<Response> {
  const locale = app.locale;
  let extras: EditPartialExtras = {};
  let message = app.t('proposed_date_added');

  return runEditCommand(app, {
    redirectTo: `/edit/${id}`,
    apply: async (rules, session) => {
      const rawTimes = Array.isArray(values['time[]'])
        ? values['time[]'].filter((value): value is string => typeof value === 'string')
        : [];
      const validation = v.safeParse(buildTupleSchema(app, session.venues), values);
      if (!validation.success) {
        const errors = mapValidationToErrors(validation);
        if (app.isPartial) {
          return app.html(renderEditPartials(app, session, {
            times: rawTimes,
            generatorError: errors.fields['venueNumber'] ?? errors.global ?? errors.fields['generate'] ?? app.t('proposed_date_time_invalid'),
            generatorFromError: errors.fields['fromDate'],
            generatorToError: errors.fields['toDate'],
            fromDate: typeof values['fromDate'] === 'string' ? values['fromDate'] : '',
            toDate: typeof values['toDate'] === 'string' ? values['toDate'] : '',
          }), {status: 400});
        }
        return redirectAfterEdit(app, session);
      }

      const times = validation.output['time[]'];
      const fromDate = validation.output.fromDate;
      const toDate = validation.output.toDate;
      const fromDateToken = formatIsoToDateOnlyLocaleTokens(fromDate, locale);
      const toDateToken = formatIsoToDateOnlyLocaleTokens(toDate, locale);
      if (times.length > MAX_TUPLES) {
        // ponytail: the fixed 7-row form can never exceed MAX_TUPLES; this is a
        // security guard against a hand-crafted oversized time[] array.
        if (app.isPartial) {
          return app.html(renderEditPartials(app, session, {
            generatorError: app.t('proposed_date_time_invalid'),
            fromDate: fromDateToken,
            toDate: toDateToken,
          }), {status: 400});
        }
        return redirectAfterEdit(app, session);
      }

      const parsed = parseTupleTimes(times, locale);
      if (parsed.invalidRowIndex !== undefined) {
        if (app.isPartial) {
          return app.html(renderEditPartials(app, session, {
            times,
            generatorInvalidRow: parsed.invalidRowIndex,
            fromDate: fromDateToken,
            toDate: toDateToken,
          }), {status: 400});
        }
        return redirectAfterEdit(app, session);
      }

      if (parsed.tuples.length === 0) {
        return renderPartial(app, session, {times, generatorError: app.t('proposed_dates_generate_none'), fromDate: fromDateToken, toDate: toDateToken});
      }

      // Validate from/to date constraints
      const nowIso = nowPlainDateTimeIso();
      const todayDate = Temporal.PlainDate.from(nowIso);

      const fromDatePlain = Temporal.PlainDate.from(fromDate);
      const toDatePlain = Temporal.PlainDate.from(toDate);

      // Validate from >= today
      if (Temporal.PlainDate.compare(fromDatePlain, todayDate) < 0) {
        return renderPartial(app, session, {
          times,
          generatorFromError: app.t('proposed_dates_generate_from_invalid'),
          fromDate: fromDateToken,
          toDate: toDateToken,
        });
      }

      // Validate to > from
      if (Temporal.PlainDate.compare(toDatePlain, fromDatePlain) <= 0) {
        return renderPartial(app, session, {
          times,
          generatorToError: app.t('proposed_dates_generate_to_invalid'),
          fromDate: fromDateToken,
          toDate: toDateToken,
        });
      }

      // Validate to <= cap
      const capDate = session.originalMatchDateTime !== undefined
        ? Temporal.PlainDate.from(session.originalMatchDateTime).add({weeks: MAX_FORWARD_WEEKS_FROM_ORIGINAL})
        : todayDate.add({weeks: MAX_FORWARD_WEEKS_FROM_ORIGINAL});

      if (Temporal.PlainDate.compare(toDatePlain, capDate) > 0) {
        const toErrorKey = session.originalMatchDateTime !== undefined
          ? 'proposed_dates_generate_to_invalid'
          : 'proposed_dates_generate_to_invalid_no_anchor';
        return renderPartial(app, session, {
          times,
          generatorToError: app.t(toErrorKey),
          fromDate: fromDateToken,
          toDate: toDateToken,
        });
      }

      // Build datetime boundaries for the generator
      const fromIso = `${fromDate}T00:00`;
      const toIso = `${toDate}T23:59`;

      const venueNumber = validation.output.venueNumber;
      // Venue-aware dedup at the handler seam (spec decision): only existing dates
      // at the form venue can collide with the generated ones, so the composite
      // "<start>|<venue>" keys are built from those. The generator stays
      // venue-unaware — it just matches candidates against the given keys.
      const existingStarts = session.proposedDates
        .filter((pd) => (pd.venueNumber ?? 1) === (venueNumber ?? 1))
        .map((pd) => `${pd.dateTimeRange.start}|${pd.venueNumber ?? 1}`);
      const generated = generateProposedDates({
        fromIso,
        toIso,
        todayIso: nowIso,
        tuples: parsed.tuples,
        existingStarts,
      });

      if (generated.added.length === 0) {
        return renderPartial(app, session, {times, generatorError: app.t('proposed_dates_generate_none'), fromDate: fromDateToken, toDate: toDateToken});
      }

      let updated = session;
      const addedIds: string[] = [];
      for (const startIso of generated.added) {
        const proposed = rules.proposeDate(updated, startIso, 'organizer', venueNumber);
        updated = proposed.session;
        addedIds.push(proposed.proposedDate.id);
      }
      updated = await withClashCheck(updated, addedIds);

      extras = {
        times,
        generatorSuccessCount: generated.added.length,
        fromDate: fromDateToken,
        toDate: toDateToken,
      };
      message = app.t('proposed_dates_generate_added', {count: String(generated.added.length)});
      return updated;
    },
    message: () => message,
    extras: () => extras,
  });
}

function handleSingleSubmit(
  app: App,
  id: string,
  values: Record<string, unknown>,
): Promise<Response> {
  const locale = app.locale;
  let extras: EditPartialExtras = {};

  return runEditCommand(app, {
    redirectTo: `/edit/${id}`,
    apply: async (rules, session) => {
      const rawDateTime = typeof values['proposedDateTime'] === 'string' ? values['proposedDateTime'] : '';
      const rawVenueNumber = typeof values['venueNumber'] === 'string' ? values['venueNumber'] : undefined;
      const validation = v.safeParse(buildSingleDateSchema(app, session.venues), {
        proposedDateTime: rawDateTime,
        venueNumber: rawVenueNumber,
      });

      if (!validation.success) {
        const errors = mapValidationToErrors(validation);
        if (app.isPartial) {
          return app.html(renderEditPartials(app, session, {
            proposedDateTime: rawDateTime,
            error: errors.fields['proposedDateTime'],
            globalError: errors.fields['venueNumber'] ?? errors.global,
            ...defaultGeneratorDateRange(locale, session.originalMatchDateTime),
          }), {status: 400});
        }
        return app.redirect(`/edit/${id}?organizerPassword=${organizerQuery(app)}`);
      }

      const proposedDateTime = validation.output.proposedDateTime;
      const venueNumber = validation.output.venueNumber;
      const parsed = parseLocaleDateTime(proposedDateTime, locale);
      // ponytail: the schema's `check` predicate already guarantees `parsed` is defined.
      // Use ?-chained parse so the lint ban on non-null assertions stays clean.
      const parsedOrFail = parsed ?? app.failure(app.t('proposed_date_time_invalid'));
      const proposed = rules.proposeDate(session, parsedOrFail.toString(), 'organizer', venueNumber);
      const updated = await withClashCheck(proposed.session, [proposed.proposedDate.id]);

      extras = {
        success: true,
        ...defaultGeneratorDateRange(locale, session.originalMatchDateTime),
      };
      return updated;
    },
    message: app.t('proposed_date_added'),
    extras: () => extras,
  });
}

interface GeneratorRenderExtras {
  times?: string[];
  generatorError?: string;
  generatorSuccessCount?: number;
  generatorFromError?: string;
  generatorToError?: string;
  fromDate?: string;
  toDate?: string;
}

function renderPartial(
  app: App,
  session: Postponement,
  extras: GeneratorRenderExtras,
  updatedSession: Postponement = session,
): Response {
  if (app.isPartial) {
    return app.html(renderEditPartials(app, updatedSession, extras));
  }
  return app.redirect(`/edit/${session.id}`);
}
