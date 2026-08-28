import type { JSX } from 'hono/jsx/jsx-runtime';
import type { AppLocale, TranslateFn } from '../../../locales';
import { translations } from '../../../locales/constants';
import type { PostponementStatus, VoteTallyItem } from '../../../lib/models';
import { ErrorContainer } from '../../partials/error-container';
import { OwnTeamVotes } from './own-team-votes';
import type { OwnTeamView } from './own-team-view';
import { StatusChip } from './status-chip';
import { VoteTallySection } from './vote-tally-section';

export interface ProposedDateTallyItem extends VoteTallyItem {
  votableByOpponent: boolean;
}

export type EditPartialsData = OwnTeamView & {
  proposedDates: ProposedDateTallyItem[];
  homeProposedDates: VoteTallyItem[];
  awayProposedDates: VoteTallyItem[];
};

export interface ProposedDatesSectionProps extends EditPartialsData {
  sessionId: string;
  status: PostponementStatus;
  reopenCount: number;
  t: TranslateFn;
  locale: AppLocale;
  inputFormat: string;
  proposedDateTime?: string;
  error?: string;
  success?: boolean;
  generateRows?: number;
  generatorError?: string;
  generatorSuccessCount?: number;
}

// ponytail: cap of 14 matches the pure generator's MAX_TUPLES. The server
// re-renders the form after every grow/remove so these client clamps are UX
// hints only; Issue 04 enforces the cap server-side.
const MAX_TUPLES = 14;

function clampRows(rows: number | undefined): number {
  if (typeof rows !== 'number' || !Number.isFinite(rows)) {
    return 1;
  }
  return Math.max(1, Math.min(Math.floor(rows), MAX_TUPLES));
}

interface GenerateFormProps {
  sessionId: string;
  t: TranslateFn;
  locale: AppLocale;
  inputFormat: string;
  weekdays: readonly string[];
  rows: number;
  error?: string;
  successCount?: number;
}

function GenerateForm(props: GenerateFormProps): JSX.Element {
  const {sessionId, t, locale, inputFormat, weekdays, rows} = props;
  const capped = clampRows(rows);
  const rowAction = '/edit/'.concat(sessionId, '/proposed-dates');
  const headingId = 'generate-tuple-heading';
  return (
    <form
      hx-post={rowAction}
      hx-target="#proposed-dates-management"
      class="mt-4"
      aria-labelledby={headingId}
    >
      <h4 id={headingId}>{t('proposed_dates_generate_section')}</h4>
      <p>{t('proposed_dates_generate_help')}</p>
      <input type="hidden" name="generate" value="tuple"/>
      <ol class="list no-margin" aria-label={t('proposed_dates_generate_section')}>
        {Array.from({length: capped}, (_, index) => (
          <li key={index} class="row items-center gap mt-2">
            <div class="field label border">
              <select id={`weekday-${index}`} name="weekday[]">
                {weekdays.map((label, wIndex) => (
                  <option key={wIndex + 1} value={wIndex + 1} selected={wIndex === 0}>{label}</option>
                ))}
              </select>
              <label for={`weekday-${index}`}>{t('proposed_dates_generate_section')}</label>
            </div>
            <div class="field label border fill max">
              <input
                id={`time-${index}`}
                type="text"
                name="time[]"
                placeholder={inputFormat}
                lang={locale}
                autocomplete="off"
                aria-invalid={props.error ? 'true' : undefined}
              />
              <label for={`time-${index}`}>{inputFormat}</label>
            </div>
            <button
              type="submit"
              name="action"
              value="remove"
              formaction={`${rowAction}?rowIndex=${String(index)}`}
              disabled={capped === 1}
              aria-label={t('proposed_dates_generate_remove_row')}
              class="button outline"
            >
              <i aria-hidden="true">close</i>
              {t('proposed_dates_generate_remove_row')}
            </button>
          </li>
        ))}
      </ol>
      <div class="row items-center gap mt-4">
        <button
          type="submit"
          name="action"
          value="grow"
          disabled={capped >= MAX_TUPLES}
          class="button outline"
        >
          {t('proposed_dates_generate_add_row')}
        </button>
        <button type="submit">{t('proposed_dates_generate_button')}</button>
      </div>
      {props.error ? (
        <p class="error mt-2" role="alert">{props.error}</p>
      ) : null}
      {typeof props.successCount === 'number' && props.successCount > 0 ? (
        <div class="toast success top mt-2" role="alert">
          <i aria-hidden="true">check_circle</i>
          <div class="max">
            <p>{t('proposed_dates_generate_added', {count: String(props.successCount)})}</p>
          </div>
        </div>
      ) : null}
    </form>
  );
}

function weekdayLabels(locale: AppLocale): readonly string[] {
  const labels = translations[locale].weekdays_short;
  return Array.isArray(labels) ? labels : [];
}

export function ProposedDatesSection(props: ProposedDatesSectionProps): JSX.Element {
  const confirmed = props.status === 'Confirmed';
  const weekdays = weekdayLabels(props.locale);

  return (
    <section id="proposed-dates-management" class="padding small-round surface-variant s12 m6" aria-live="polite">
      <header>
        <h3 tabindex={-1}>{props.t('proposed_dates_management')}</h3>
      </header>
      {props.reopenCount > 0 ? (
        <p class="chip outline">{props.t('reopened_count', {count: String(props.reopenCount)})}</p>
      ) : null}
      {confirmed ? (
        <form hx-post={`/edit/${props.sessionId}/reopen`} hx-target="#proposed-dates-management" class="mt-4">
          <button type="submit">{props.t('reopen')}</button>
        </form>
      ) : (
        <>
          {props.proposedDates.length > 0 ? (
            <ul id="proposed-date-list" class="list" aria-label={props.t('proposed_dates_management')}>
              {props.proposedDates.map((proposedDate) => (
                <li key={proposedDate.id}>
                  <div class="row items-center gap">
                    <i aria-hidden="true">event</i>
                    <div class="max">{proposedDate.display}</div>
                  </div>
                  <div class="row items-center gap wrap mt-2">
                    <label class="switch">
                      <input
                        type="checkbox"
                        hx-post={`/edit/${props.sessionId}/proposed-date-visibility?proposedDateId=${proposedDate.id}&votable=${!proposedDate.votableByOpponent}`}
                        hx-target="#proposed-dates-management"
                        checked={proposedDate.votableByOpponent}
                      />
                      <span>{props.t('votable_by_opponent')}</span>
                    </label>
                    {proposedDate.votableByOpponent ? (
                      <button
                        type="button"
                        class="button outline"
                        hx-post={`/edit/${props.sessionId}/proposed-date-confirm?proposedDateId=${proposedDate.id}`}
                        hx-target="#proposed-dates-management"
                      >
                        {props.t('confirm_date')}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      class="button outline"
                      data-open-dialog={`delete-proposed-date-${proposedDate.id}`}
                    >
                      <i aria-hidden="true">delete</i>
                      {props.t('delete_proposed_date')}
                    </button>
                  </div>
                  <dialog
                    id={`delete-proposed-date-${proposedDate.id}`}
                    class="padding small-round surface"
                    aria-labelledby={`delete-proposed-date-title-${proposedDate.id}`}
                  >
                    <h4 id={`delete-proposed-date-title-${proposedDate.id}`}>
                      {props.t('delete_proposed_date_confirm_title')}
                    </h4>
                    <p>{props.t('delete_proposed_date_confirm_message', {date: proposedDate.display})}</p>
                    <div class="row items-center gap">
                      <button type="button" class="button outline" data-dismiss-dialog>{props.t('cancel')}</button>
                      <form
                        hx-post={`/edit/${props.sessionId}/proposed-date-delete?proposedDateId=${proposedDate.id}`}
                        hx-target="#proposed-dates-management"
                      >
                        <button type="submit" class="button">{props.t('delete_proposed_date')}</button>
                      </form>
                    </div>
                  </dialog>
                </li>
              ))}
            </ul>
          ) : null}
          <GenerateForm
            sessionId={props.sessionId}
            t={props.t}
            locale={props.locale}
            inputFormat={props.inputFormat}
            weekdays={weekdays}
            rows={clampRows(props.generateRows)}
            error={props.generatorError}
            successCount={props.generatorSuccessCount}
          />
          <form
            hx-post={`/edit/${props.sessionId}/proposed-dates`}
            hx-target="#proposed-dates-management"
            class="mt-4"
            {...{['hx-on::after-request']: "focusAfterSwap('#proposed-dates-management')"}}
          >
            <div class="row items-center gap">
              <div class={`field label border fill max${props.error ? ' invalid' : ''}`}>
                <input
                  type="text"
                  id="proposedDateTime"
                  name="proposedDateTime"
                  value={props.proposedDateTime ?? ''}
                  required={!props.error}
                  aria-invalid={props.error ? 'true' : undefined}
                  aria-describedby={props.error ? 'proposedDateTime-error' : undefined}
                  placeholder={props.inputFormat}
                  lang={props.locale}
                  autocomplete="off"
                />
                <label for="proposedDateTime">{props.t('proposed_date_time_label')}</label>
                {props.error ? (
                  <span id="proposedDateTime-error" class="error" role="alert">{props.error}</span>
                ) : null}
              </div>
              <button
                type="button"
                id="proposedDateTimePicker"
                class="button"
                aria-label={props.t('proposed_date_time_picker_label')}
                title={props.t('proposed_date_time_picker_label')}
              >
                <i aria-hidden="true">calendar_today</i>
              </button>
            </div>
            <div class="right-align">
              <button type="submit">{props.t('add_proposed_date')}</button>
            </div>
          </form>
          {props.success ? (
            <div class="toast success top" role="alert">
              <i aria-hidden="true">check_circle</i>
              <div class="max">
                <p>{props.t('proposed_date_added')}</p>
              </div>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

export interface ProposedDatesSectionPartialProps extends ProposedDatesSectionProps {
  globalError?: string;
}

export function ProposedDatesSectionPartial(props: ProposedDatesSectionPartialProps): JSX.Element {
  return (
    <>
      <ErrorContainer globalError={props.globalError} isOob={true} />
      <StatusChip status={props.status} t={props.t} oob={true} />
      <ProposedDatesSection {...props} />
      <VoteTallySection
        homeProposedDates={props.homeProposedDates}
        awayProposedDates={props.awayProposedDates}
        t={props.t}
        oob={true}
      />
      <OwnTeamVotes
        organizerPlayers={props.organizerPlayers}
        ownTeamResults={props.ownTeamResults}
        t={props.t}
        oob={true}
      />
    </>
  );
}
