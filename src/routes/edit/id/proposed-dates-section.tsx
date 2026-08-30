import type { JSX } from 'hono/jsx/jsx-runtime';
import type { DateClashes } from '../../../lib/clashes';
import type { PostponementStatus, Venue, VoteTallyItem } from '../../../lib/models';
import type { VenueOccupancy } from '../../../lib/venue-occupancy';
import type { AppLocale, TranslateFn } from '../../../locales';
import { localeConfig, weekdayLabels } from '../../../locales';
import { ClashInfo } from '../../partials/clash-info';
import { ErrorContainer } from '../../partials/error-container';
import { VenueBadge } from '../../partials/venue-badge';
import { VenueOccupancyInfo } from '../../partials/venue-occupancy-info';
import type { OwnTeamView } from './own-team-view';
import { OwnTeamVotes } from './own-team-votes';
import { StatusChip } from './status-chip';
import { VoteTallySection } from './vote-tally-section';

export interface ProposedDateTallyItem extends VoteTallyItem {
  votable: boolean;
  clashes?: DateClashes;
  /** venue number the date applies to; absent means venue 1 (legacy dates predate venues). */
  venueNumber?: number;
  /** Venue Occupancy snapshot from the last check; absent when never checked, the scrape failed, or the session has no club id. */
  venueOccupancy?: VenueOccupancy;
}

/**
 * Number of venue options offered when the Postponement carries no scraped
 * venues. Single source of truth for the spec rule "empty venues → 1..10",
 * shared with the handler's validation bound.
 */
export const FALLBACK_VENUE_COUNT = 10;

export type EditPartialsData = OwnTeamView & {
  proposedDates: ProposedDateTallyItem[];
  homeProposedDates: VoteTallyItem[];
  awayProposedDates: VoteTallyItem[];
  clashCheckable: boolean;
  venues: Venue[];
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
  times?: readonly string[];
  generatorInvalidRow?: number;
  generatorError?: string;
  generatorSuccessCount?: number;
  generatorFromError?: string;
  generatorToError?: string;
  refreshError?: boolean;
  confirmClashWarning?: boolean;
  fromDate?: string;
  toDate?: string;
}

interface GenerateFormProps {
  sessionId: string;
  t: TranslateFn;
  locale: AppLocale;
  venueOptions: JSX.Element[];
  times?: readonly string[];
  invalidRow?: number;
  error?: string;
  successCount?: number;
  fromError?: string;
  toError?: string;
  fromDate?: string;
  toDate?: string;
}

function GenerateForm(props: GenerateFormProps): JSX.Element {
  const {sessionId, t, locale, times, fromDate, toDate, fromError, toError} = props;
  const rowAction = `/edit/${sessionId}/proposed-dates`;
  const headingId = 'generate-tuple-heading';
  const timeFormat = localeConfig(locale).timeFormat;
  const timeLabel = t('proposed_dates_generate_time_label');
  const submitted = times ?? [];
  const fromValue = fromDate ?? '';
  const toValue = toDate ?? '';
  // ponytail: the fixed Monday–Sunday grid is the preset; each row's time input
  // is empty unless the organizer's latest submit round-trips a value for it.
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
      <div class="row items-center gap mt-2">
        <div class={`field label border${fromError ? ' invalid' : ''}`}>
          <input
            id="fromDate"
            type="date"
            name="fromDate"
            value={fromValue}
            aria-invalid={fromError ? 'true' : undefined}
            aria-describedby={fromError ? 'fromDate-error' : undefined}
          />
          <label for="fromDate">{t('proposed_dates_generate_from_label')}</label>
          {fromError ? (
            <span id="fromDate-error" class="error" role="alert">{fromError}</span>
          ) : null}
        </div>
        <div class={`field label border${toError ? ' invalid' : ''}`}>
          <input
            id="toDate"
            type="date"
            name="toDate"
            value={toValue}
            aria-invalid={toError ? 'true' : undefined}
            aria-describedby={toError ? 'toDate-error' : undefined}
          />
          <label for="toDate">{t('proposed_dates_generate_to_label')}</label>
          {toError ? (
            <span id="toDate-error" class="error" role="alert">{toError}</span>
          ) : null}
        </div>
        <div class="field label border">
          <select id="generateVenueNumber" name="venueNumber">
            {props.venueOptions}
          </select>
          <label for="generateVenueNumber">{t('proposed_date_venue_label')}</label>
        </div>
      </div>
      <ol class="list no-margin" aria-label={t('proposed_dates_generate_section')}>
        {weekdayLabels[locale].map((weekday, index) => {
          const invalid = props.invalidRow === index;
          const rawValue = submitted[index];
          const value = rawValue !== undefined && rawValue.length > 0 ? rawValue : undefined;
          return (
            <li key={weekday} class="row items-center gap mt-2">
              {/* ponytail: the weekday text doubles as the input's label (its
               `for` points at the time input), so the accessible name of each
               time input is "Mo Time", "Tu Time", ... — association without a
               separate invisible label. */}
              <label for={`time-${index}`}>{weekday}</label>
              <div class={`field label border fill max${invalid ? ' invalid' : ''}`}>
                <input
                  id={`time-${index}`}
                  type="text"
                  name="time[]"
                  placeholder={timeFormat}
                  lang={locale}
                  autocomplete="off"
                  value={value}
                  aria-invalid={invalid ? 'true' : undefined}
                  aria-describedby={invalid ? `time-${index}-error` : undefined}
                />
                <label for={`time-${index}`}>{timeLabel}</label>
                {invalid ? (
                  <span id={`time-${index}-error`} class="error" role="alert">{t('proposed_date_time_invalid')}</span>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
      <div class="row items-center gap mt-4">
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

export function ProposedDatesSection(props: ProposedDatesSectionProps): JSX.Element {
  const confirmed = props.status === 'Confirmed';

  const venueOptions = props.venues.length > 0
    ? props.venues.map((venue) => (
      <option key={venue.venueNumber} value={venue.venueNumber}>
        {venue.venueNumber} – {venue.name}
      </option>
    ))
    : // ponytail: without scraped venues the organizer still picks a hall 1–10;
      // a richer default (e.g. the original match's hall) is out of scope.
      Array.from({length: FALLBACK_VENUE_COUNT}, (_, index) => (
        <option key={index + 1} value={index + 1}>{index + 1}</option>
      ));

  return (
    <section id="proposed-dates-management" class="padding small-round surface-variant s12 m8" aria-live="polite">
      <header>
        <h3 tabindex={-1}>{props.t('proposed_dates_management')}</h3>
      </header>
      {props.reopenCount > 0 ? (
        <p class="chip outline">{props.t('reopened_count', {count: String(props.reopenCount)})}</p>
      ) : null}
      {props.confirmClashWarning ? (
        <p class="confirm-clash-warning mt-2" role="alert">
          <i aria-hidden="true">warning</i>
          {props.t('clash_check_confirm_warning')}
        </p>
      ) : null}
      {confirmed ? (
        <form hx-post={`/edit/${props.sessionId}/reopen`} hx-target="#proposed-dates-management" class="mt-4">
          <button type="submit">{props.t('reopen')}</button>
        </form>
      ) : (
         <>
           {props.clashCheckable ? (
             <div class="row items-center gap mt-2">
               <button
                 type="button"
                 class="button outline"
                 hx-post={`/edit/${props.sessionId}/refresh-clashes`}
                 hx-target="#proposed-dates-management"
               >
                 <i aria-hidden="true">refresh</i>
                 {props.t('clash_check_refresh')}
               </button>
             </div>
           ) : null}
           {props.refreshError ? (
             <p class="error mt-2" role="alert">{props.t('clash_check_refresh_failed')}</p>
           ) : null}
           {props.proposedDates.length > 0 ? (
             <div class="scroll">
               <table id="proposed-date-list">
                 <caption class="visually-hidden">{props.t('proposed_dates_management')}</caption>
                 <thead>
                 <tr>
                   <th scope="col">{props.t('proposed_date_time_label')}</th>
                   <th scope="col">{props.t('votable_short')}</th>
                   <th scope="col">{props.t('actions')}</th>
                 </tr>
                 </thead>
                 <tbody>
                 {props.proposedDates.map((proposedDate) => {
                   const hasClashes = proposedDate.clashes !== undefined &&
                     (proposedDate.clashes.home.length > 0 || proposedDate.clashes.away.length > 0);
                   const isClean = proposedDate.clashes !== undefined && !hasClashes;
                   const rowAriaLabel = hasClashes ? props.t('clash_row_label', {date: proposedDate.display}) : isClean
                                                                                                                ? props.t('clash_row_clean_label', {date: proposedDate.display})
                                                                                                                : undefined;
                   return (
                     <tr key={proposedDate.id} class={hasClashes ? 'clash-row' : undefined} aria-label={rowAriaLabel}>
                       <th scope="row">
                          <div class="row items-center gap">
                            <i aria-hidden="true">event</i>
                            <div class="max">{proposedDate.display}</div>
                            <VenueBadge venueNumber={proposedDate.venueNumber} venues={props.venues}/>
                          </div>
                         <ClashInfo
                           clashes={proposedDate.clashes}
                           clashCheckable={props.clashCheckable}
                           t={props.t}
                           locale={props.locale}
                         />
                         <VenueOccupancyInfo
                           occupancy={proposedDate.venueOccupancy}
                           t={props.t}
                         />
                       </th>
                       <td>
                         <label
                           class="switch"
                           title={props.t('votable_toggle')}
                         >
                           <input
                             type="checkbox"
                             id={`votable-${proposedDate.id}`}
                             hx-post={`/edit/${props.sessionId}/proposed-date-visibility?proposedDateId=${proposedDate.id}&votable=${!proposedDate.votable}`}
                             hx-target="#proposed-dates-management"
                             checked={proposedDate.votable}
                             aria-label={props.t('votable_toggle')}
                           />
                           <span></span>
                         </label>
                       </td>
                       <td>
                         <div class="row items-center gap">
                           <button
                             type="button"
                             class="button outline"
                             data-open-dialog={`delete-proposed-date-${proposedDate.id}`}
                             aria-label={props.t('delete_proposed_date')}
                             title={props.t('delete_proposed_date')}
                           >
                             <i aria-hidden="true">delete</i>
                           </button>
                           {proposedDate.votable ? (
                             <button
                               type="button"
                               class="button outline"
                               hx-post={`/edit/${props.sessionId}/proposed-date-confirm?proposedDateId=${proposedDate.id}`}
                               hx-target="#proposed-dates-management"
                             >
                               {props.t('confirm_date')}
                             </button>
                           ) : null}
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
                             <button type="button" class="button outline"
                                     data-dismiss-dialog>{props.t('cancel')}</button>
                             <form
                               hx-post={`/edit/${props.sessionId}/proposed-date-delete?proposedDateId=${proposedDate.id}`}
                               hx-target="#proposed-dates-management"
                             >
                               <button type="submit" class="button">{props.t('delete_proposed_date')}</button>
                             </form>
                           </div>
                         </dialog>
                       </td>
                     </tr>
                   );
                 })}
                 </tbody>
               </table>
             </div>
           ) : null}
<GenerateForm
                sessionId={props.sessionId}
                t={props.t}
                locale={props.locale}
                venueOptions={venueOptions}
                times={props.times}
               invalidRow={props.generatorInvalidRow}
               error={props.generatorError}
               successCount={props.generatorSuccessCount}
               fromError={props.generatorFromError}
               toError={props.generatorToError}
               fromDate={props.fromDate}
               toDate={props.toDate}
             />
           <form
             hx-post={`/edit/${props.sessionId}/proposed-dates`}
             hx-target="#proposed-dates-management"
             class="mt-4"
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
                <div class="field label border">
                  <select id="venueNumber" name="venueNumber">
                    {venueOptions}
                  </select>
                  <label for="venueNumber">{props.t('proposed_date_venue_label')}</label>
                </div>
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
      <ErrorContainer globalError={props.globalError} isOob={true}/>
      <StatusChip status={props.status} t={props.t} oob={true}/>
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
