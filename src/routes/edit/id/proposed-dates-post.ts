import { Temporal } from '@js-temporal/polyfill';
import * as v from 'valibot';
import type { App } from '../../../app';
import { mapValidationToErrors } from '../../../lib/map-validation-to-errors';
import { ProposedDate } from '../../../lib/models';
import { Reschedule } from '../../../lib/reschedule';
import { DATETIME_LOCAL_PATTERN, formatLocalizedDateTime, parseIsoToPlainDateTime } from '../../../lib/temporal-utils';
import { toIntlLocale } from '../../../locales';

export const handleEditProposedDatesPost = async (app: App): Promise<Response> => {
  const id = app.requireParam('id');
  const session = app.sessions[id];
  if (!session) {
    app.notFound('Session not found');
  }

  const ProposedDateSchema = v.object({
    proposedDateTime: v.pipe(
      v.string(),
      v.regex(DATETIME_LOCAL_PATTERN, app.t('proposed_date_time_invalid')),
      v.check((val: string): boolean => {
        try {
          Temporal.PlainDateTime.from(val);
          return true;
        } catch {
          return false;
        }
      }, app.t('proposed_date_time_invalid')),
    ),
  });

  function toDisplayList(proposedDates: ProposedDate[]): {
    display: string
  }[]
  {
    return proposedDates.map((pd: ProposedDate) => ({
      display: formatLocalizedDateTime(parseIsoToPlainDateTime(pd.dateTimeRange.start), toIntlLocale(app.locale)),
    }));
  }

  const values = await app.c.req.parseBody();
  const validation = v.safeParse(ProposedDateSchema, values);

  if (!validation.success) {
    const errors = mapValidationToErrors(validation);

    if (app.isPartial) {
      return app.c.html(app.render('edit/id/proposed-dates-section.eta', {
        sessionId: session.id,
        proposedDates: toDisplayList(session.proposedDates),
        proposedDateTime: (values['proposedDateTime'] as string | undefined) ?? '',
        error: errors.fields['proposedDateTime'],
        globalError: errors.global,
      }), {status: 400});
    }

    return app.c.redirect(`/edit/${id}?ownerPassword=${app.c.req.query('ownerPassword') ?? ''}`);
  }

  const {proposedDateTime} = validation.output;
  const dt = Temporal.PlainDateTime.from(proposedDateTime)
    .toString();
  const updated = new Reschedule().proposeDate(session, dt, 'owner').session;
  app.sessions[id] = updated;

  if (app.isPartial) {
    return app.c.html(app.render('edit/id/proposed-dates-section.eta', {
      sessionId: updated.id,
      proposedDates: toDisplayList(updated.proposedDates),
      success: true,
    }));
  }
  return app.c.redirect(`/edit/${id}`);
};
