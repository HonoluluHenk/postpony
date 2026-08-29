import * as v from 'valibot';
import type { App } from '../../../app';
import { MAX_TUPLES, generateProposedDates, type ProposedDateTuple } from '../../../lib/proposed-dates-generator';
import { mapValidationToErrors } from '../../../lib/map-validation-to-errors';
import { PostponementRules } from '../../../lib/postponement';
import { nowPlainDateTimeIso, parseLocaleDateTime, parseLocaleTimeOnly } from '../../../lib/temporal-utils';
import type { Postponement } from '../../../lib/models';
import { renderEditPartials } from './render-edit-partials';

const TUPLE_DISCRIMINATOR = 'tuple';

function ownerQuery(app: App): string {
  return app.c.req.query('ownerPassword') ?? '';
}

function redirectAfterEdit(app: App, session: Postponement): Response {
  return app.c.redirect(`/edit/${session.id}?ownerPassword=${ownerQuery(app)}`);
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === 'string');
  }
  if (typeof value === 'string') {
    return [value];
  }
  return [];
}

function normalizeRowCount(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 1;
  }
  const floored = Math.floor(parsed);
  if (floored < 1) {
    return 1;
  }
  return Math.min(floored, MAX_TUPLES);
}

function readTupleRows(values: Record<string, unknown>): {
  weekdays: string[];
  times: string[];
} {
  return {
    weekdays: asStringArray(values['weekday[]']),
    times: asStringArray(values['time[]']),
  };
}

interface ParsedTuples {
  tuples: ProposedDateTuple[];
  invalidRowIndex: number | undefined;
}

function parseTupleRows(weekdays: string[], times: string[], locale: App['locale']): ParsedTuples {
  // ponytail: caller guarantees equal lengths upstream; this loop trusts that and
  // only validates each row's content. Trust+guard layout keeps the function a
  // pure elementwise mapper.
  const tuples: ProposedDateTuple[] = [];
  for (const [index, rawWeekday] of weekdays.entries()) {
    const weekday = Number(rawWeekday);
    if (!Number.isInteger(weekday) || weekday < 1 || weekday > 7) {
      return {tuples: [], invalidRowIndex: index};
    }
    const rawTime = times[index] ?? '';
    const parsedTime = parseLocaleTimeOnly(rawTime, locale);
    if (parsedTime === undefined) {
      return {tuples: [], invalidRowIndex: index};
    }
    tuples.push({weekday, hour: parsedTime.hour, minute: parsedTime.minute});
  }
  return {tuples, invalidRowIndex: undefined};
}

interface SingleDateOutput {proposedDateTime: string}
interface TupleOutput {
  generate: typeof TUPLE_DISCRIMINATOR;
  'weekday[]': string[];
  'time[]': string[];
  proposedDateTime?: never;
}

function buildTupleSchema(app: App): v.BaseSchema<unknown, TupleOutput, v.BaseIssue<unknown>> {
  return v.object({
    generate: v.literal(TUPLE_DISCRIMINATOR, app.t('proposed_date_time_invalid')),
    'weekday[]': v.array(v.string()),
    'time[]': v.array(v.string()),
    // ponytail: rogue POST combining the generator branch with the single-date
    // field is explicitly rejected. The schema encodes it via the `never`
    // output type and the strict object parser — passing `proposedDateTime`
    // makes the parse fail before any persistence happens.
    proposedDateTime: v.optional(v.never(app.t('proposed_date_time_invalid'))),
  });
}

function buildSingleDateSchema(app: App): v.BaseSchema<unknown, SingleDateOutput, v.BaseIssue<unknown>> {
  return v.object({
    proposedDateTime: v.pipe(
      v.string(),
      v.check((val: string): boolean => parseLocaleDateTime(val, app.locale) !==
        undefined, app.t('proposed_date_time_invalid')),
    ),
  });
}

const RowActionSchema = v.union([
  v.object({action: v.literal('grow')}),
  v.object({action: v.literal('remove')}),
]);

export const handleEditProposedDatesPost = async (app: App): Promise<Response> => {
  const id = app.requireParam('id');
  const session = await app.store.get(id);
  if (!session) {
    app.notFound('Session not found');
  }

  const locale = app.locale;
  const values = await app.c.req.parseBody({all: true}) as Record<string, unknown>;

  if (typeof values['action'] === 'string') {
    const actionValidation = v.safeParse(RowActionSchema, values);
    if (!actionValidation.success) {
      app.failure(app.t('proposed_date_time_invalid'), 400);
    }
    const rowCount = readTupleRows(values).weekdays.length || 1;
    const requestedRows = values['action'] === 'grow'
      ? Math.min(rowCount + 1, MAX_TUPLES)
      : Math.max(rowCount - 1, 1);
    return renderPartial(app, session, {generateRows: requestedRows});
  }

  if (values['generate'] === TUPLE_DISCRIMINATOR) {
    return handleTupleSubmit(app, session, locale, values);
  }

  return handleSingleSubmit(app, session, id, locale, values);
};

async function handleTupleSubmit(
  app: App,
  session: Postponement,
  locale: App['locale'],
  values: Record<string, unknown>,
): Promise<Response> {
  const validation = v.safeParse(buildTupleSchema(app), values);
  if (!validation.success) {
    const errors = mapValidationToErrors(validation);
    if (app.isPartial) {
      const {weekdays} = readTupleRows(values);
      const requestedRows = normalizeRowCount(weekdays.length || 1);
      return app.c.html(renderEditPartials(app, session, {
        generateRows: requestedRows,
        generatorError: errors.global ?? errors.fields['generate'] ?? app.t('proposed_date_time_invalid'),
      }), {status: 400});
    }
    return redirectAfterEdit(app, session);
  }

  const {weekdays, times} = readTupleRows(values);
  if (Math.max(weekdays.length, times.length) > MAX_TUPLES
    || weekdays.length !== times.length) {
    if (app.isPartial) {
      return app.c.html(renderEditPartials(app, session, {
        generateRows: normalizeRowCount(weekdays.length || 1),
        generatorError: app.t('proposed_date_time_invalid'),
      }), {status: 400});
    }
    return redirectAfterEdit(app, session);
  }

  const parsed = parseTupleRows(weekdays, times, locale);
  if (parsed.invalidRowIndex !== undefined) {
    if (app.isPartial) {
      return app.c.html(renderEditPartials(app, session, {
        generateRows: normalizeRowCount(weekdays.length || 1),
        generatorError: app.t('proposed_date_time_invalid'),
      }), {status: 400});
    }
    return redirectAfterEdit(app, session);
  }

  if (parsed.tuples.length === 0) {
    return renderPartial(app, session, {generatorError: app.t('proposed_dates_generate_none')});
  }

  const generated = generateProposedDates({
    anchorIso: session.originalMatchDateTime,
    todayIso: nowPlainDateTimeIso(),
    tuples: parsed.tuples,
    existingStarts: session.proposedDates.map((pd) => pd.dateTimeRange.start),
  });

  if (generated.added.length === 0) {
    return renderPartial(app, session, {generatorError: app.t('proposed_dates_generate_none')});
  }

  const rules = new PostponementRules();
  let updated = session;
  for (const startIso of generated.added) {
    updated = rules.proposeDate(updated, startIso, 'owner').session;
  }
  await app.store.save(updated);

  const extras: {generatorSuccessCount: number; generateRows: number; generatorError?: string} = {
    generateRows: normalizeRowCount(weekdays.length || 1),
    generatorSuccessCount: generated.added.length,
  };
  if (generated.usedFallbackWindow) {
    extras.generatorError = app.t('proposed_dates_generate_no_anchor');
  }
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
  const validation = v.safeParse(buildSingleDateSchema(app), {proposedDateTime: rawDateTime});

  if (!validation.success) {
    const errors = mapValidationToErrors(validation);
    if (app.isPartial) {
      return app.c.html(renderEditPartials(app, session, {
        proposedDateTime: rawDateTime,
        error: errors.fields['proposedDateTime'],
        globalError: errors.global,
      }), {status: 400});
    }
    return app.c.redirect(`/edit/${id}?ownerPassword=${ownerQuery(app)}`);
  }

  const proposedDateTime = validation.output.proposedDateTime;
  const parsed = parseLocaleDateTime(proposedDateTime, locale);
  // ponytail: the schema's `check` predicate already guarantees `parsed` is defined.
  // Use ?-chained parse so the lint ban on non-null assertions stays clean.
  const parsedOrFail = parsed ?? app.failure(app.t('proposed_date_time_invalid'));
  const updated = new PostponementRules().proposeDate(session, parsedOrFail.toString(), 'owner').session;
  await app.store.save(updated);

  if (app.isPartial) {
    return app.c.html(renderEditPartials(app, updated, {success: true}));
  }
  return app.c.redirect(`/edit/${id}`);
}

interface GeneratorRenderExtras {
  generateRows?: number;
  generatorError?: string;
  generatorSuccessCount?: number;
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
