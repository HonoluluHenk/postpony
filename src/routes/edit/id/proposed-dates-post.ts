import * as v from 'valibot';
import type { App } from '../../../app';
import { mapValidationToErrors } from '../../../lib/map-validation-to-errors';
import type { ProposedDate, VoteTallyItem } from '../../../lib/models';
import { Reschedule } from '../../../lib/reschedule';
import { formatLocalizedDateTime, parseIsoToPlainDateTime, parseLocaleDateTime } from '../../../lib/temporal-utils';
import type { AppLocale } from '../../../locales';

interface ProposedDateTallyItem extends VoteTallyItem {
  awayTeamVotable: boolean;
}

function toProposedDateItems(
  proposedDates: ProposedDate[],
  tallies: Record<string, {
    yes: number;
    no: number;
    maybe: number
  }>,
  locale: AppLocale,
): ProposedDateTallyItem[] {
  return proposedDates.map((pd) => {
    const counts = tallies[pd.id] ?? {yes: 0, no: 0, maybe: 0};
    return {
      id: pd.id,
      display: formatLocalizedDateTime(parseIsoToPlainDateTime(pd.dateTimeRange.start), locale),
      awayTeamVotable: pd.awayTeamVotable,
      yes: counts.yes,
      no: counts.no,
      maybe: counts.maybe,
    };
  });
}

function toVoteTallyItems(
  proposedDates: ProposedDate[],
  tallies: Record<string, {
    yes: number;
    no: number;
    maybe: number
  }>,
  locale: AppLocale,
): VoteTallyItem[] {
  return proposedDates.map((pd) => {
    const counts = tallies[pd.id] ?? {yes: 0, no: 0, maybe: 0};
    return {
      id: pd.id,
      display: formatLocalizedDateTime(parseIsoToPlainDateTime(pd.dateTimeRange.start), locale),
      yes: counts.yes,
      no: counts.no,
      maybe: counts.maybe,
    };
  });
}

export const handleEditProposedDatesPost = async (app: App): Promise<Response> => {
  const id = app.requireParam('id');
  const session = await app.store.get(id);
  if (!session) {
    app.notFound('Session not found');
  }

  const locale = app.locale;

  const ProposedDateSchema = v.object({
    proposedDateTime: v.pipe(
      v.string(),
      v.check((val: string): boolean => parseLocaleDateTime(val, locale) !==
        undefined, app.t('proposed_date_time_invalid')),
    ),
  });

  const values = await app.c.req.parseBody();
  const validation = v.safeParse(ProposedDateSchema, values);

  const reschedule = new Reschedule();

  if (!validation.success) {
    const errors = mapValidationToErrors(validation);

    if (app.isPartial) {
      const tallies = reschedule.tally(session);
      const homeTallies = reschedule.tally(session, 'home');
      const awayTallies = reschedule.tally(session, 'away');
      return app.c.html(app.render('edit/id/proposed-dates-section.eta', {
        sessionId: session.id,
        proposedDates: toProposedDateItems(session.proposedDates, tallies, locale),
        homeProposedDates: toVoteTallyItems(session.proposedDates, homeTallies, locale),
        awayProposedDates: toVoteTallyItems(session.proposedDates, awayTallies, locale),
        proposedDateTime: (values['proposedDateTime'] as string | undefined) ?? '',
        error: errors.fields['proposedDateTime'],
        globalError: errors.global,
      }), {status: 400});
    }

    return app.c.redirect(`/edit/${id}?ownerPassword=${app.c.req.query('ownerPassword') ?? ''}`);
  }

  const {proposedDateTime} = validation.output;
  const parsed = parseLocaleDateTime(proposedDateTime, locale);
  if (!parsed) {
    // Unreachable: the schema already checked parseability.
    app.failure(app.t('proposed_date_time_invalid'));
  }
  const updated = reschedule.proposeDate(session, parsed.toString(), 'owner').session;
  await app.store.save(updated);

  if (app.isPartial) {
    const tallies = reschedule.tally(updated);
    const homeTallies = reschedule.tally(updated, 'home');
    const awayTallies = reschedule.tally(updated, 'away');
    return app.c.html(app.render('edit/id/proposed-dates-section.eta', {
      sessionId: updated.id,
      proposedDates: toProposedDateItems(updated.proposedDates, tallies, locale),
      homeProposedDates: toVoteTallyItems(updated.proposedDates, homeTallies, locale),
      awayProposedDates: toVoteTallyItems(updated.proposedDates, awayTallies, locale),
      success: true,
    }));
  }
  return app.c.redirect(`/edit/${id}`);
};
