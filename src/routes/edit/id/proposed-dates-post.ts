import * as v from 'valibot';
import type { App } from '../../../app';
import { computeClashes, type ClashesByProposedDate } from '../../../lib/clashes';
import { fetchMatches } from '../../../lib/click-tt-scraper';
import { MAX_TUPLES, MAX_FORWARD_WEEKS_FROM_ORIGINAL, generateProposedDates, type ProposedDateTuple } from '../../../lib/proposed-dates-generator';
import { mapValidationToErrors } from '../../../lib/map-validation-to-errors';
import { PostponementRules } from '../../../lib/postponement';
import { nowPlainDateTimeIso, parseLocaleDateTime, parseLocaleTimeOnly } from '../../../lib/temporal-utils';
import type { Postponement, Venue } from '../../../lib/models';
import { Temporal } from '@js-temporal/polyfill';
import { renderEditPartials } from './render-edit-partials';
import { FALLBACK_VENUE_COUNT } from './proposed-dates-section';

const TUPLE_DISCRIMINATOR = 'tuple';

function ownerQuery(app: App): string {
  return app.c.req.query('ownerPassword') ?? '';
}

function redirectAfterEdit(app: App, session: Postponement): Response {
  return app.c.redirect(`/edit/${session.id}?ownerPassword=${ownerQuery(app)}`);
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
  fromDate?: string;
  toDate?: string;
  venueNumber?: number;
  proposedDateTime?: never;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

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
    fromDate: v.optional(v.pipe(v.string(), v.regex(DATE_PATTERN))),
    toDate: v.optional(v.pipe(v.string(), v.regex(DATE_PATTERN))),
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
 * Proposed Date in the session. Returns undefined when the session has no team
 * identities (hand-entered match) or when either scrape fails — the caller then
 * saves the dates clash-free and the page renders without clash info. Shared by
 * the add paths and the manual refresh handler so one code path drives both.
 */
export async function computeClashesForSession(session: Postponement): Promise<ClashesByProposedDate | undefined> {
  const homeIdentity = session.homeTeamIdentity;
  const guestIdentity = session.guestTeamIdentity;
  if (!homeIdentity || !guestIdentity) {
    return undefined;
  }
  try {
    const [homeSchedule, awaySchedule] = await Promise.all([
      fetchMatches(homeIdentity.championship, homeIdentity.group, homeIdentity.teamtable),
      fetchMatches(guestIdentity.championship, guestIdentity.group, guestIdentity.teamtable),
    ]);
    return computeClashes(
      session.proposedDates,
      homeSchedule,
      awaySchedule,
      {
        start: session.originalMatchDateTime,
        homeTeam: session.homeTeam,
        guestTeam: session.guestTeam,
      },
    );
  } catch {
    // ponytail: a failed scrape never blocks adding dates — the dates are saved
    // without clash data and render without clash lines. On manual refresh the
    // caller keeps the previous snapshot instead.
    return undefined;
  }
}

export function attachClashes(session: Postponement, clashes: ClashesByProposedDate): Postponement {
  return {
    ...session,
    proposedDates: session.proposedDates.map((pd) => ({...pd, clashes: clashes[pd.id]})),
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
  const clashes = await computeClashesForSession(session);
  let result = session;
  if (clashes !== undefined) {
    result = deselectClashingAddedDates(attachClashes(session, clashes), addedIds, clashes);
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
        fromDate: typeof values['fromDate'] === 'string' ? values['fromDate'] : '',
        toDate: typeof values['toDate'] === 'string' ? values['toDate'] : '',
      }), {status: 400});
    }
    return redirectAfterEdit(app, session);
  }

  const times = validation.output['time[]'];
  const rawFromDate = validation.output.fromDate;
  const rawToDate = validation.output.toDate;
  if (times.length > MAX_TUPLES) {
    // ponytail: the fixed 7-row form can never exceed MAX_TUPLES; this is a
    // security guard against a hand-crafted oversized time[] array.
    if (app.isPartial) {
      return app.c.html(renderEditPartials(app, session, {
        generatorError: app.t('proposed_date_time_invalid'),
        fromDate: rawFromDate ?? '',
        toDate: rawToDate ?? '',
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
        fromDate: rawFromDate ?? '',
        toDate: rawToDate ?? '',
      }), {status: 400});
    }
    return redirectAfterEdit(app, session);
  }

  if (parsed.tuples.length === 0) {
    return renderPartial(app, session, {times, generatorError: app.t('proposed_dates_generate_none'), fromDate: rawFromDate ?? '', toDate: rawToDate ?? ''});
  }

  // Validate from/to date constraints
  const nowIso = nowPlainDateTimeIso();
  const _now = Temporal.PlainDateTime.from(nowIso);
  const todayDate = Temporal.PlainDate.from(nowIso);

  // Defaults: when no anchor, use today/today+4w; when anchor exists, use today/anchor+4w
  const defaultToDate = session.originalMatchDateTime !== undefined
    ? Temporal.PlainDate.from(session.originalMatchDateTime).add({weeks: MAX_FORWARD_WEEKS_FROM_ORIGINAL}).toString()
    : todayDate.add({weeks: MAX_FORWARD_WEEKS_FROM_ORIGINAL}).toString();

  const fromDate = rawFromDate ?? todayDate.toString();
  const toDate = rawToDate ?? defaultToDate;

  const fromDatePlain = Temporal.PlainDate.from(fromDate);
  const toDatePlain = Temporal.PlainDate.from(toDate);

  // Validate from >= today
  if (Temporal.PlainDate.compare(fromDatePlain, todayDate) < 0) {
    return renderPartial(app, session, {
      times,
      generatorFromError: app.t('proposed_dates_generate_from_invalid'),
      fromDate,
      toDate,
    });
  }

  // Validate to > from
  if (Temporal.PlainDate.compare(toDatePlain, fromDatePlain) <= 0) {
    return renderPartial(app, session, {
      times,
      generatorToError: app.t('proposed_dates_generate_to_invalid'),
      fromDate,
      toDate,
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
      fromDate,
      toDate,
    });
  }

  // Build datetime boundaries for the generator
  const fromIso = `${fromDate}T00:00`;
  const toIso = `${toDate}T23:59`;

  const generated = generateProposedDates({
    fromIso,
    toIso,
    todayIso: nowIso,
    tuples: parsed.tuples,
    existingStarts: session.proposedDates.map((pd) => pd.dateTimeRange.start),
  });

  if (generated.added.length === 0) {
    return renderPartial(app, session, {times, generatorError: app.t('proposed_dates_generate_none'), fromDate, toDate});
  }

  const rules = new PostponementRules();
  let updated = session;
  const addedIds: string[] = [];
  const venueNumber = validation.output.venueNumber;
  for (const startIso of generated.added) {
    const proposed = rules.proposeDate(updated, startIso, 'owner', venueNumber);
    updated = proposed.session;
    addedIds.push(proposed.proposedDate.id);
  }
  updated = await saveWithClashCheck(app, updated, addedIds);

  const extras: {times: string[]; generatorSuccessCount: number; generatorError?: string; generatorFromError?: string; generatorToError?: string; fromDate?: string; toDate?: string} = {
    times,
    generatorSuccessCount: generated.added.length,
    fromDate,
    toDate,
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
      }), {status: 400});
    }
    return app.c.redirect(`/edit/${id}?ownerPassword=${ownerQuery(app)}`);
  }

  const proposedDateTime = validation.output.proposedDateTime;
  const venueNumber = validation.output.venueNumber;
  const parsed = parseLocaleDateTime(proposedDateTime, locale);
  // ponytail: the schema's `check` predicate already guarantees `parsed` is defined.
  // Use ?-chained parse so the lint ban on non-null assertions stays clean.
  const parsedOrFail = parsed ?? app.failure(app.t('proposed_date_time_invalid'));
  const proposed = new PostponementRules().proposeDate(session, parsedOrFail.toString(), 'owner', venueNumber);
  const updated = await saveWithClashCheck(app, proposed.session, [proposed.proposedDate.id]);

  if (app.isPartial) {
    return app.c.html(renderEditPartials(app, updated, {success: true}));
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
