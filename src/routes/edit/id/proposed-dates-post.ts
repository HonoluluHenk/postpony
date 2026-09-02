import * as v from 'valibot';
import type { App } from '../../../app';
import { computeClashes, type ClashesByProposedDate } from '../../../lib/clashes';
import { fetchClubMeetings, fetchMatches, seasonWindow, type Match } from '../../../lib/click-tt-scraper';
import { MAX_TUPLES, MAX_FORWARD_WEEKS_FROM_ORIGINAL, generateProposedDates, type ProposedDateTuple } from '../../../lib/proposed-dates-generator';
import { mapValidationToErrors } from '../../../lib/map-validation-to-errors';
import { PostponementRules } from '../../../lib/postponement';
import {
  formatIsoToDateOnlyLocaleTokens,
  nowPlainDateTimeIso,
  parseLocaleDateOnly,
  parseLocaleDateTime,
  parseLocaleTimeOnly,
} from '../../../lib/temporal-utils';
import { DEFAULT_CLUB_ID, type Postponement, type Venue } from '../../../lib/models';
import { computeVenueOccupancy, type VenueOccupancyByProposedDate } from '../../../lib/venue-occupancy';
import { Temporal } from '@js-temporal/polyfill';
import { renderEditPartials } from './render-edit-partials';
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
  return app.c.req.query('organizerPassword') ?? '';
}

function redirectAfterEdit(app: App, session: Postponement): Response {
  return app.c.redirect(`/edit/${session.id}?organizerPassword=${organizerQuery(app)}`);
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
  const session = await app.store.get(id);
  if (!session) {
    app.notFound('Session not found');
  }

  const locale = app.locale;
  const values = await app.c.req.parseBody({all: true}) as Record<string, unknown>;

  if (values['generate'] === TUPLE_DISCRIMINATOR) {
    return handleTupleSubmit(app, session, locale, values);
  }

  return handleSingleSubmit(app, session, id, locale, values);
};

/**
 * Scrapes both teams' click-tt schedules once and computes the Clashes of every
 * Proposed Date in the session, plus the home club's Venue Occupancy in the same
 * parallel pass. Returns undefined when the session has no team identities
 * (hand-entered match) or when either team scrape fails — the caller then saves
 * the dates clash-free and the page renders without clash info. The occupancy
 * scrape degrades on its own: a missing/failed club scrape resolves to undefined
 * and only the occupancy line is absent; clashes and the save are unaffected.
 * Shared by the add paths and the manual refresh handler so one code path drives
 * both.
 */
export interface ClashCheckResult {
  clashes: ClashesByProposedDate;
  venueOccupancy?: VenueOccupancyByProposedDate;
}

async function fetchHomeClubMeetings(session: Postponement): Promise<Match[] | undefined> {
  if (session.clubId === DEFAULT_CLUB_ID) {
    return undefined;
  }
  const championship = session.homeTeamIdentity?.championship;
  const window = championship !== undefined ? seasonWindow(championship) : undefined;
  if (window === undefined) {
    return undefined;
  }
  return fetchClubMeetings(session.clubId, window.from, window.to);
}

export async function computeClashesForSession(session: Postponement): Promise<ClashCheckResult | undefined> {
  const homeIdentity = session.homeTeamIdentity;
  const guestIdentity = session.guestTeamIdentity;
  if (!homeIdentity || !guestIdentity) {
    return undefined;
  }
  try {
    const [homeSchedule, awaySchedule, homeMeetings] = await Promise.all([
      fetchMatches(homeIdentity.championship, homeIdentity.group, homeIdentity.teamtable),
      fetchMatches(guestIdentity.championship, guestIdentity.group, guestIdentity.teamtable),
      // ponytail: a failed or inapplicable occupancy scrape must never block the
      // clash snapshot — it resolves to undefined and the occupancy line stays
      // absent. Upgrade path: surface a distinct "occupancy not checked" hint
      // when the club id exists but its scrape failed.
      fetchHomeClubMeetings(session).catch(() => undefined),
    ]);
    const originalMatch = {
      start: session.originalMatchDateTime,
      homeTeam: session.homeTeam,
      guestTeam: session.guestTeam,
    };
    return {
      clashes: computeClashes(
        session.proposedDates,
        homeSchedule,
        awaySchedule,
        originalMatch,
      ),
      venueOccupancy: homeMeetings === undefined
        ? undefined
        : computeVenueOccupancy(session.proposedDates, homeMeetings, originalMatch),
    };
  } catch {
    // ponytail: a failed scrape never blocks adding dates — the dates are saved
    // without clash data and render without clash lines. On manual refresh the
    // caller keeps the previous snapshot instead.
    return undefined;
  }
}

export function attachClashCheckResult(session: Postponement, result: ClashCheckResult): Postponement {
  return {
    ...session,
    proposedDates: session.proposedDates.map((pd) => ({
      ...pd,
      clashes: result.clashes[pd.id],
      venueOccupancy: result.venueOccupancy?.[pd.id],
    })),
  };
}

/**
 * Flips the newly added dates with a non-empty Clash set to `votable: false`,
 * so a clashing date never enters either poll without the organizer noticing.
 * Only the ids named by `addedIds` are touched; pre-existing dates keep their
 * current `votable` (respecting any manual override). Dates with an empty clash
 * set (clean) or without clash data stay votable.
 */
function deselectClashingAddedDates(
  session: Postponement,
  addedIds: readonly string[],
  clashes: ClashesByProposedDate,
): Postponement {
  const rules = new PostponementRules();
  let updated = session;
  for (const id of addedIds) {
    const dateClashes = clashes[id];
    if (dateClashes !== undefined && (dateClashes.home.length > 0 || dateClashes.away.length > 0)) {
      updated = rules.setVotable(updated, id, false);
    }
  }
  return updated;
}

async function saveWithClashCheck(
  app: App,
  session: Postponement,
  addedIds: readonly string[],
): Promise<Postponement> {
  const checkResult = await computeClashesForSession(session);
  let result = session;
  if (checkResult !== undefined) {
    result = deselectClashingAddedDates(
      attachClashCheckResult(session, checkResult),
      addedIds,
      checkResult.clashes,
    );
  }
  await app.store.save(result);
  return result;
}

async function handleTupleSubmit(
  app: App,
  session: Postponement,
  locale: App['locale'],
  values: Record<string, unknown>,
): Promise<Response> {
  const rawTimes = Array.isArray(values['time[]'])
    ? values['time[]'].filter((value): value is string => typeof value === 'string')
    : [];
  const validation = v.safeParse(buildTupleSchema(app, session.venues), values);
  if (!validation.success) {
    const errors = mapValidationToErrors(validation);
    if (app.isPartial) {
      return app.c.html(renderEditPartials(app, session, {
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
      return app.c.html(renderEditPartials(app, session, {
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
      return app.c.html(renderEditPartials(app, session, {
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

  const rules = new PostponementRules();
  let updated = session;
  const addedIds: string[] = [];
  for (const startIso of generated.added) {
    const proposed = rules.proposeDate(updated, startIso, 'organizer', venueNumber);
    updated = proposed.session;
    addedIds.push(proposed.proposedDate.id);
  }
  updated = await saveWithClashCheck(app, updated, addedIds);

  const extras: {times: string[]; generatorSuccessCount: number; generatorError?: string; generatorFromError?: string; generatorToError?: string; fromDate?: string; toDate?: string} = {
    times,
    generatorSuccessCount: generated.added.length,
    fromDate: fromDateToken,
    toDate: toDateToken,
  };
  return renderPartial(app, session, extras, updated);
}

async function handleSingleSubmit(
  app: App,
  session: Postponement,
  id: string,
  locale: App['locale'],
  values: Record<string, unknown>,
): Promise<Response> {
  const rawDateTime = typeof values['proposedDateTime'] === 'string' ? values['proposedDateTime'] : '';
  const rawVenueNumber = typeof values['venueNumber'] === 'string' ? values['venueNumber'] : undefined;
  const validation = v.safeParse(buildSingleDateSchema(app, session.venues), {
    proposedDateTime: rawDateTime,
    venueNumber: rawVenueNumber,
  });

  if (!validation.success) {
    const errors = mapValidationToErrors(validation);
    if (app.isPartial) {
      return app.c.html(renderEditPartials(app, session, {
        proposedDateTime: rawDateTime,
        error: errors.fields['proposedDateTime'],
        globalError: errors.fields['venueNumber'] ?? errors.global,
        ...defaultGeneratorDateRange(locale, session.originalMatchDateTime),
      }), {status: 400});
    }
    return app.c.redirect(`/edit/${id}?organizerPassword=${organizerQuery(app)}`);
  }

  const proposedDateTime = validation.output.proposedDateTime;
  const venueNumber = validation.output.venueNumber;
  const parsed = parseLocaleDateTime(proposedDateTime, locale);
  // ponytail: the schema's `check` predicate already guarantees `parsed` is defined.
  // Use ?-chained parse so the lint ban on non-null assertions stays clean.
  const parsedOrFail = parsed ?? app.failure(app.t('proposed_date_time_invalid'));
  const proposed = new PostponementRules().proposeDate(session, parsedOrFail.toString(), 'organizer', venueNumber);
  const updated = await saveWithClashCheck(app, proposed.session, [proposed.proposedDate.id]);

  if (app.isPartial) {
    return app.c.html(renderEditPartials(app, updated, {
      success: true,
      ...defaultGeneratorDateRange(locale, session.originalMatchDateTime),
    }));
  }
  return app.c.redirect(`/edit/${id}`);
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
    return app.c.html(renderEditPartials(app, updatedSession, extras));
  }
  return app.c.redirect(`/edit/${session.id}`);
}
