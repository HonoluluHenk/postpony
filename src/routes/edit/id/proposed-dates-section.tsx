import type { JSX } from 'hono/jsx/jsx-runtime';
import type { PostponementStatus, VoteTallyItem } from '../../../lib/models';
import type { AppLocale, TranslateFn } from '../../../locales';
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
}

export function ProposedDatesSection(props: ProposedDatesSectionProps): JSX.Element {
  const confirmed = props.status === 'Confirmed';

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
                      <form method="dialog" hx-boost="false">
                        <button type="submit" class="button outline">{props.t('cancel')}</button>
                      </form>
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
