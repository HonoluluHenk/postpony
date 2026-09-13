import type { JSX } from 'hono/jsx/jsx-runtime';
import type { DateClashes } from '../../../lib/clashes';
import type { PostponementStatus, Venue, VoteTallyItem } from '../../../lib/models';
import type { VenueOccupancy } from '../../../lib/venue-occupancy';
import type { AppLocale, TranslateFn } from '../../../locales';
import { localeConfig, weekdayLabels } from '../../../locales';
import { formatLocalizedDateTime, parseIsoToPlainDateTime } from '../../../lib/temporal-utils';
import { venueNumberToken, venueShortName } from '../../partials/venue-badge';
import type { OwnTeamView } from './own-team-view';

export interface ProposedDateTallyItem extends VoteTallyItem {
  votable: boolean;
  /** ISO start/end range of the proposed date (week grouping + date cell). */
  dateTimeRange: { start: string; end: string };
  clashes?: DateClashes;
  /** venue number the date applies to; absent means venue 1 (legacy dates predate venues). */
  venueNumber?: number;
  /** Venue Occupancy snapshot from the last check; absent when never checked, the scrape failed, or the session has no club id. */
  venueOccupancy?: VenueOccupancy;
  /** Compact date+time for the card header (weekday prefix retained), e.g. `Sa, 8/29/26, 4:00 PM`. */
  shortDisplay?: string;
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

export interface EditGridProps extends EditPartialsData {
  sessionId: string;
  status: PostponementStatus;
  reopenCount: number;
  t: TranslateFn;
  locale: AppLocale;
  inputFormat: string;
  /** Origin used to build the absolute calendar-export link. */
  baseUrl: string;
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
  playerName?: string;
  teamId?: 'home' | 'away';
  playerError?: string;
  statusMessage?: string;
}

/* ------------------------------------------------------------------ */
/* Week grouping (ISO week) helpers                                    */
/* ------------------------------------------------------------------ */

function isoWeekKey(isoStart: string): string {
  const dt = parseIsoToPlainDateTime(isoStart);
  return `${dt.yearOfWeek}-W${String(dt.weekOfYear).padStart(2, '0')}`;
}

function isoWeekRange(isoStart: string, locale: AppLocale): string {
  const date = parseIsoToPlainDateTime(isoStart).toPlainDate();
  const monday = date.subtract({days: date.dayOfWeek - 1});
  const sunday = monday.add({days: 6});
  const a = formatLocalizedDateTime(monday, locale, {month: 'short', day: 'numeric'});
  const b = formatLocalizedDateTime(sunday, locale, {month: 'short', day: 'numeric'});
  return `${a} – ${b}`;
}

interface WeekGroup {
  key: string;
  /** ISO week number; `undefined` is a Temporal typing artefact, not a real value. */
  week: number | undefined;
  range: string;
  rows: ProposedDateTallyItem[];
}

function groupByWeek(rows: readonly ProposedDateTallyItem[], locale: AppLocale): WeekGroup[] {
  const groups: WeekGroup[] = [];
  for (const row of rows) {
    const key = isoWeekKey(row.dateTimeRange.start);
    const last = groups[groups.length - 1];
    if (last?.key !== key) {
      const dt = parseIsoToPlainDateTime(row.dateTimeRange.start);
      groups.push({key, week: dt.weekOfYear, range: isoWeekRange(row.dateTimeRange.start, locale), rows: [row]});
    } else {
      last.rows.push(row);
    }
  }
  return groups;
}

function sortedRows(rows: readonly ProposedDateTallyItem[]): ProposedDateTallyItem[] {
  return [...rows].sort((a, b) => {
    if (a.dateTimeRange.start !== b.dateTimeRange.start) {
      return a.dateTimeRange.start < b.dateTimeRange.start ? -1 : 1;
    }
    return a.id < b.id ? -1 : 1;
  });
}

/* ------------------------------------------------------------------ */
/* Vote dots (replaces the three vote tables)                          */
/* ------------------------------------------------------------------ */

function dotClass(vote: OwnTeamView['ownTeamResults'][number]['votes'][number]['vote']): string {
  if (vote === 'Yes') {
    return 'vote-dot--yes';
  }
  if (vote === 'No') {
    return 'vote-dot--no';
  }
  if (vote === 'IfNecessary') {
    return 'vote-dot--ifnecessary';
  }
  return 'vote-dot--none';
}

function voteTitle(playerName: string, vote: OwnTeamView['ownTeamResults'][number]['votes'][number]['vote']): string {
  return vote ? `${playerName}: ${vote}` : `${playerName}: no vote`;
}

function VoteDots(props: { row: ProposedDateTallyItem; roster: readonly {id: string; name: string}[]; ownTeamResults: EditGridProps['ownTeamResults']; t: TranslateFn }): JSX.Element {
  const result = props.ownTeamResults.find((r) => r.dateId === props.row.id);
  const voteFor = (playerId: string): OwnTeamView['ownTeamResults'][number]['votes'][number]['vote'] =>
    result?.votes.find((v) => v.playerId === playerId)?.vote ?? null;
  const voted = result?.voted ?? 0;
  const total = result?.total ?? 0;
  return (
    <div class="vote-dots">
      <span class="vote-dots-label">{props.t('own_team_votes')}</span>
      <div class="vote-dots-group">
        {props.roster.map((player) => {
          const vote = voteFor(player.id);
          return <span key={player.id} class={`vote-dot ${dotClass(vote)}`} title={voteTitle(player.name, vote)} />;
        })}
      </div>
      <span class="vote-dot-count">{props.t('voted_count', {voted: String(voted), total: String(total)})}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Date chips (clashes / venue occupancy / clean / unchecked)          */
/* ------------------------------------------------------------------ */

function DateChips(props: { row: ProposedDateTallyItem; clashCheckable: boolean; venues: readonly Venue[]; t: TranslateFn; locale: AppLocale }): JSX.Element {
  const {row, t, locale} = props;
  const venue = venueShortName(row.venueNumber, props.venues);
  const venueLabel = venue ? `${venueNumberToken(row.venueNumber)} ${venue}` : venueNumberToken(row.venueNumber);
  const hasClashes = row.clashes !== undefined && (row.clashes.home.length > 0 || row.clashes.away.length > 0);
  const clean = row.clashes !== undefined && !hasClashes;
  const chips: JSX.Element[] = [
    <span class="chip" title={venueLabel}>{venueLabel}</span>,
  ];
  if (hasClashes) {
    for (const clash of row.clashes?.home ?? []) {
      chips.push(
        <span class="chip chip--error">
          {t('clash_line_home', {time: formatLocalizedDateTime(parseIsoToPlainDateTime(clash.start), locale, {timeStyle: 'short'}), opponent: clash.opponent})}
        </span>,
      );
    }
    for (const clash of row.clashes?.away ?? []) {
      chips.push(
        <span class="chip chip--error">
          {t('clash_line_away', {time: formatLocalizedDateTime(parseIsoToPlainDateTime(clash.start), locale, {timeStyle: 'short'}), opponent: clash.opponent})}
        </span>,
      );
    }
  } else if (clean) {
    chips.push(<span class="chip chip--clean">{t('clash_check_clean')}</span>);
  } else if (!props.clashCheckable) {
    chips.push(<span class="chip">{t('clash_check_not_checked')}</span>);
  }
  if (row.venueOccupancy !== undefined) {
    if (row.venueOccupancy.count === 0) {
      chips.push(<span class="chip chip--clean">{t('venue_occupancy_clean')}</span>);
    } else {
      chips.push(
        <span class="chip chip--warn">
          {row.venueOccupancy.count === 1
            ? t('venue_occupancy_line_one')
            : t('venue_occupancy_line', {count: String(row.venueOccupancy.count)})}
        </span>,
      );
    }
  }
  return <div class="date-chips">{chips}</div>;
}

/* ------------------------------------------------------------------ */
/* Date actions (wired: votable, confirm, delete)                      */
/* ------------------------------------------------------------------ */

function DateActions(props: { row: ProposedDateTallyItem; sessionId: string; t: TranslateFn; confirmed: boolean }): JSX.Element {
  const {row, sessionId, t} = props;
  return (
    <div class="date-actions">
      <label class="action action--votable" title={t('votable_toggle')}>
        <input
          type="checkbox"
          hx-post={`/edit/${sessionId}/proposed-date-visibility?proposedDateId=${row.id}&votable=${!row.votable}`}
          hx-target="#edit-grid"
          checked={row.votable}
          aria-label={t('votable_toggle')}
        />
        {t('votable_short')}: {row.votable ? t('votable_on') : t('votable_off')}
      </label>
      {row.votable && !props.confirmed ? (
        <button
          type="button"
          class="action action--primary"
          hx-post={`/edit/${sessionId}/proposed-date-confirm?proposedDateId=${row.id}`}
          hx-target="#edit-grid"
        >
          {t('confirm_date')}
        </button>
      ) : null}
      <button
        type="button"
        class="action action--outline"
        data-open-dialog={`delete-proposed-date-${row.id}`}
        aria-label={t('delete_proposed_date')}
        title={t('delete_proposed_date')}
      >
        <i aria-hidden="true">delete</i>
      </button>
      <dialog id={`delete-proposed-date-${row.id}`} class="padding small-round surface" aria-labelledby={`delete-proposed-date-title-${row.id}`}>
        <h4 id={`delete-proposed-date-title-${row.id}`}>{t('delete_proposed_date_confirm_title')}</h4>
        <p>{t('delete_proposed_date_confirm_message', {date: row.display})}</p>
        <div class="row items-center gap">
          <button type="button" class="button outline" data-dismiss-dialog>{t('cancel')}</button>
          <form hx-post={`/edit/${sessionId}/proposed-date-delete?proposedDateId=${row.id}`} hx-target="#edit-grid">
            <button type="submit" class="button">{t('delete_proposed_date')}</button>
          </form>
        </div>
      </dialog>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Generator form (moved into the sidebar)                             */
/* ------------------------------------------------------------------ */

export interface GenerateFormProps {
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

export function GenerateForm(props: GenerateFormProps): JSX.Element {
  const {sessionId, t, locale, times, fromDate, toDate, fromError, toError} = props;
  const rowAction = `/edit/${sessionId}/proposed-dates`;
  const timeFormat = localeConfig(locale).timeFormat;
  const dateFormat = localeConfig(locale).dateFormat;
  // ponytail: 24-hour locales open a numeric keypad on phones; 12-hour locales
  // keep the default letter keypad because users type an `a`/`p` for am/pm.
  const timeInputMode = localeConfig(locale).clock24 ? 'numeric' : undefined;
  const timeLabel = t('proposed_dates_generate_time_label');
  const submitted = times ?? [];
  const fromValue = fromDate ?? '';
  const toValue = toDate ?? '';
  return (
    <form hx-post={rowAction} hx-target="#edit-grid">
      <p class="muted">{t('proposed_dates_generate_help')}</p>
      <input type="hidden" name="generate" value="tuple"/>
      <div class="generate-controls mt-2">
        <div class={`date-field field label border${fromError ? ' invalid' : ''}`}>
          <input
            id="fromDate"
            type="text"
            name="fromDate"
            value={fromValue}
            placeholder={dateFormat}
            lang={locale}
            autocomplete="off"
            inputmode="numeric"
            aria-invalid={fromError ? 'true' : undefined}
            aria-describedby={fromError ? 'fromDate-error' : undefined}
          />
          <label for="fromDate">{t('proposed_dates_generate_from_label')}</label>
          {fromError ? <span id="fromDate-error" class="error" role="alert">{fromError}</span> : null}
          <button type="button" id="fromDate-picker" class="button picker-btn" aria-label={t('proposed_dates_generate_from_picker_label')} title={t('proposed_dates_generate_from_picker_label')}>
            <i aria-hidden="true">calendar_today</i>
          </button>
        </div>
        <div class={`date-field field label border${toError ? ' invalid' : ''}`}>
          <input
            id="toDate"
            type="text"
            name="toDate"
            value={toValue}
            placeholder={dateFormat}
            lang={locale}
            autocomplete="off"
            inputmode="numeric"
            aria-invalid={toError ? 'true' : undefined}
            aria-describedby={toError ? 'toDate-error' : undefined}
          />
          <label for="toDate">{t('proposed_dates_generate_to_label')}</label>
          {toError ? <span id="toDate-error" class="error" role="alert">{toError}</span> : null}
          <button type="button" id="toDate-picker" class="button picker-btn" aria-label={t('proposed_dates_generate_to_picker_label')} title={t('proposed_dates_generate_to_picker_label')}>
            <i aria-hidden="true">calendar_today</i>
          </button>
        </div>
        <div class="venue-field field label border">
          <select id="generateVenueNumber" name="venueNumber">
            {props.venueOptions}
          </select>
          <label for="generateVenueNumber">{t('proposed_date_venue_label')}</label>
        </div>
      </div>
      <ol class="list no-margin generate-time-grid" aria-label={t('proposed_dates_generate_section')}>
        {weekdayLabels[locale].map((weekday, index) => {
          const invalid = props.invalidRow === index;
          const rawValue = submitted[index];
          const value = rawValue !== undefined && rawValue.length > 0 ? rawValue : undefined;
          return (
            <li key={weekday} class="row items-center gap mt-2 generate-time-row">
              <label for={`time-${index}`}>{weekday}</label>
              <div class={`time-field field label border${invalid ? ' invalid' : ''}`}>
                <input
                  id={`time-${index}`}
                  type="text"
                  name="time[]"
                  placeholder={timeFormat}
                  lang={locale}
                  autocomplete="off"
                  inputmode={timeInputMode}
                  value={value}
                  aria-invalid={invalid ? 'true' : undefined}
                  aria-describedby={invalid ? `time-${index}-error` : undefined}
                />
                <label for={`time-${index}`}>{timeLabel}</label>
                {invalid ? <span id={`time-${index}-error`} class="error" role="alert">{t('proposed_date_time_invalid')}</span> : null}
                <button type="button" id={`time-${index}-picker`} class="button picker-btn" aria-label={t('proposed_dates_generate_time_picker_label')} title={t('proposed_dates_generate_time_picker_label')}>
                  <i aria-hidden="true">schedule</i>
                </button>
              </div>
            </li>
          );
        })}
      </ol>
      <div class="row items-center gap mt-4">
        <button type="submit">{t('proposed_dates_generate_button')}</button>
      </div>
      {props.error ? <p class="error mt-2" role="alert">{props.error}</p> : null}
      {typeof props.successCount === 'number' && props.successCount > 0 ? (
        <div class="toast success top mt-2">
          <i aria-hidden="true">check_circle</i>
          <div class="max">
            <p>{t('proposed_dates_generate_added', {count: String(props.successCount)})}</p>
          </div>
        </div>
      ) : null}
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* The rail: week-grouped dense date list + add-date form              */
/* ------------------------------------------------------------------ */

function AddDateForm(props: { sessionId: string; t: TranslateFn; locale: AppLocale; inputFormat: string; venueOptions: JSX.Element[]; proposedDateTime?: string; error?: string }): JSX.Element {
  const {sessionId, t, locale, inputFormat, venueOptions} = props;
  return (
    <form hx-post={`/edit/${sessionId}/proposed-dates`} hx-target="#edit-grid" class="mt-4">
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
            placeholder={inputFormat}
            lang={locale}
            autocomplete="off"
          />
          <label for="proposedDateTime">{t('proposed_date_time_label')}</label>
          {props.error ? <span id="proposedDateTime-error" class="error" role="alert">{props.error}</span> : null}
          <button type="button" id="proposedDateTimePicker" class="button picker-btn" aria-label={t('proposed_date_time_picker_label')} title={t('proposed_date_time_picker_label')}>
            <i aria-hidden="true">calendar_today</i>
          </button>
        </div>
        <div class="field label border">
          <select id="venueNumber" name="venueNumber">
            {venueOptions}
          </select>
          <label for="venueNumber">{t('proposed_date_venue_label')}</label>
        </div>
      </div>
      <div class="right-align">
        <button type="submit">{t('add_proposed_date')}</button>
      </div>
    </form>
  );
}

export function ProposedDatesRail(props: EditGridProps): JSX.Element {
  const confirmed = props.status === 'Confirmed';
  const roster = props.organizerPlayers.map((p) => ({id: p.id, name: p.name}));
  const venueOptions = props.venues.length > 0
                       ? props.venues.map((venue) => (
      <option key={venue.venueNumber} value={venue.venueNumber}>
        ({venue.venueNumber}) - {venue.shortName}
      </option>
    ))
                       : Array.from({length: FALLBACK_VENUE_COUNT}, (_, index) => (
                         <option key={index + 1} value={index + 1}>{index + 1}</option>
                       ));
  const weeks = groupByWeek(sortedRows(props.proposedDates), props.locale);

  return (
    <section id="proposed-dates-management" class="edit-rail">
      <h2>{props.t('proposed_dates_management')}</h2>
      <div class="row items-center gap wrap mt-2">
        {props.proposedDates.some((pd) => pd.votable) ? (
          <a class="button outline" href={`${props.baseUrl}/edit/${props.sessionId}/calendar.ics`} hx-boost="false">
            <i aria-hidden="true">download</i>
            {props.t('export_calendar')}
          </a>
        ) : null}
        {props.clashCheckable && props.proposedDates.length > 0 ? (
          <button type="button" class="button outline" hx-post={`/edit/${props.sessionId}/refresh-clashes`} hx-target="#edit-grid">
            <i aria-hidden="true">refresh</i>
            {props.t('clash_check_refresh')}
          </button>
        ) : null}
      </div>
      {props.refreshError ? <p class="error mt-2" role="alert">{props.t('clash_check_refresh_failed')}</p> : null}
      {props.confirmClashWarning ? (
        <p class="confirm-clash-warning mt-2">
          <i aria-hidden="true">warning</i>
          {props.t('clash_check_confirm_warning')}
        </p>
      ) : null}

      {weeks.map((week) => (
        <section key={week.key}>
          <h3 class="week-head">
            <span>{props.t('week_label', {week: String(week.week)})}</span>
            <span class="week-range">{week.range}</span>
          </h3>
          {week.rows.map((row) => {
            const dt = parseIsoToPlainDateTime(row.dateTimeRange.start);
            const hasClashes = row.clashes !== undefined && (row.clashes.home.length > 0 || row.clashes.away.length > 0);
            const isClean = row.clashes !== undefined && !hasClashes;
            const ariaLabel = hasClashes ? props.t('clash_row_label', {date: row.display}) : isClean
                                                                                             ? props.t('clash_row_clean_label', {date: row.display})
                                                                                             : undefined;
            return (
              <article key={row.id} class={`date-row${hasClashes ? ' clash-row' : ''}`} role={ariaLabel ? 'group' : undefined} aria-label={ariaLabel}>
                <div class="date-cell">
                  <span class="date-day">{weekdayLabels[props.locale][dt.dayOfWeek - 1] ?? ''}</span>
                  <span class="date-num">{formatLocalizedDateTime(dt, props.locale, {month: 'long', day: 'numeric'})}</span>
                  <span class="date-time">{formatLocalizedDateTime(dt, props.locale, {timeStyle: 'short'})}</span>
                  <span class="date-year">{dt.year}</span>
                </div>
                <div class="date-main">
                  <DateChips row={row} clashCheckable={props.clashCheckable} venues={props.venues} t={props.t} locale={props.locale}/>
                  <VoteDots row={row} roster={roster} ownTeamResults={props.ownTeamResults} t={props.t}/>
                  <DateActions row={row} sessionId={props.sessionId} t={props.t} confirmed={confirmed}/>
                </div>
              </article>
            );
          })}
        </section>
      ))}

      {props.proposedDates.length === 0 ? (
        <p class="muted mt-2">{props.t('proposed_dates_none')}</p>
      ) : null}

      {!confirmed ? (
        <AddDateForm
          sessionId={props.sessionId}
          t={props.t}
          locale={props.locale}
          inputFormat={props.inputFormat}
          venueOptions={venueOptions}
          proposedDateTime={props.proposedDateTime}
          error={props.error}
        />
      ) : null}
      {props.success ? (
        <div class="toast success top mt-2">
          <i aria-hidden="true">check_circle</i>
          <div class="max">
            <p>{props.t('proposed_date_added')}</p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
