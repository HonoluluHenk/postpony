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

  function renderProposedDateList(proposedDates: ProposedDate[]): string {
    return proposedDates.map((pd: ProposedDate) => `
        <li>
          <i>event</i>
          <div class="max">
            ${formatLocalizedDateTime(parseIsoToPlainDateTime(pd.dateTimeRange.start), toIntlLocale(app.locale))}
          </div>
        </li>`)
      .join('');
  }

  const values = await app.c.req.parseBody();
  const validation = v.safeParse(ProposedDateSchema, values);

  if (!validation.success) {
    const errors = mapValidationToErrors(validation);

    if (app.isPartial) {
      const proposedDateTime = values['proposedDateTime'] as string;
      const error = errors.fields['proposedDateTime'];

      return app.c.html(`
        <div id="error-container" hx-swap-oob="true">
          ${errors.global ? `
            <div class="error padding white-text" role="alert">
              <i aria-hidden="true">error</i>
              <div class="max">
                <p>${errors.global}</p>
              </div>
            </div>` : ''}
        </div>
        <section id="proposed-dates-management" class="padding small-round surface-variant s12 m4">
          <header>
            <h4>${app.t('proposed_dates_management')}</h4>
          </header>
          <ul id="proposed-date-list" class="list">
            ${renderProposedDateList(session.proposedDates)}
          </ul>
          <form hx-post="/edit/${session.id}/proposed-dates" hx-target="#proposed-dates-management" class="mt-4">
            <div class="field label border fill ${error ? 'invalid' : ''}">
              <input type="datetime-local" id="proposedDateTime" name="proposedDateTime" value="${proposedDateTime}">
              <label for="proposedDateTime">${app.t('proposed_date_time_label')}</label>
              <span class="error" role="alert">${error ?? ''}</span>
            </div>
            <div class="right-align">
              <button type="submit">${app.t('add_proposed_date')}</button>
            </div>
          </form>
        </section>
      `, {status: 400});
    }

    return app.c.redirect(`/edit/${id}?ownerPassword=${app.c.req.query('ownerPassword') ?? ''}`);
  }

  const {proposedDateTime} = validation.output;
  const dt = Temporal.PlainDateTime.from(proposedDateTime)
    .toString();
  const updated = new Reschedule().proposeDate(session, dt, 'owner').session;
  app.sessions[id] = updated;

  if (app.isPartial) {
    return app.c.html(`
      <div id="error-container" hx-swap-oob="true"></div>
      <section id="proposed-dates-management" class="padding small-round surface-variant s12 m4">
        <header>
          <h4>${app.t('proposed_dates_management')}</h4>
        </header>
        <ul id="proposed-date-list" class="list">
          ${renderProposedDateList(updated.proposedDates)}
        </ul>
        <form hx-post="/edit/${session.id}/proposed-dates" hx-target="#proposed-dates-management" class="mt-4">
          <div class="field label border fill">
            <input type="datetime-local" id="proposedDateTime" name="proposedDateTime" required>
            <label for="proposedDateTime">${app.t('proposed_date_time_label')}</label>
          </div>
          <div class="right-align">
            <button type="submit">${app.t('add_proposed_date')}</button>
          </div>
        </form>
        <div class="toast success top" role="alert">
          <i aria-hidden="true">check_circle</i>
          <div class="max">
            <p>${app.t('proposed_date_added')}</p>
          </div>
        </div>
      </section>
    `);
  }
  return app.c.redirect(`/edit/${id}`);
};
