import type { JSX } from 'hono/jsx/jsx-runtime';
import type { ViewContext } from '../../app';
import type { Clash } from '../../lib/clashes';
import type { Player, Postponement } from '../../lib/models';
import { formatLocalizedDateTime, parseIsoToPlainDateTime } from '../../lib/temporal-utils';
import { type AppLocale, type TranslateFn, weekdayLabels } from '../../locales';
import { StatusChip } from '../edit/id/status-chip';
import { pageLayout } from '../layouts/main';
import { type DateSort, groupByAvailability, groupByWeek, SortControl, sortedRows } from '../partials/sort-control';
import { StatusAnnouncement } from '../partials/status-announcement';
import { withOpponentPassword } from './opponent-utils';

export interface OpponentDateItem {
  id: string;
  display: string;
  /** ISO start/end range backing the four-part date cell. */
  dateTimeRange: {
    start: string;
    end: string
  };
  /**
   * The opponent side's own clash lines only: undefined when never checked
   * (the date renders no clash UI at all), empty when checked clean.
   */
  ownClashes?: Clash[];
  opponentVotable: boolean;
  accepted: boolean;
  yes: number;
  no: number;
  ifNecessary: number;
}

export interface OpponentViewData {
  opponentTeamName: string;
  players: Player[];
  dates: OpponentDateItem[];
  /** List ordering; `date` is week-grouped, `availability` groups by the opponent team's own votes. */
  sort: DateSort;
  /**
   * Whether the opponent side carries a click-tt team identity, i.e. the
   * re-check button can run. Without an identity the page offers no check.
   */
  refreshCheckable: boolean;
}

export interface OpponentPageProps extends ViewContext, OpponentViewData {
  title?: string;
  session: Postponement;
  opponentCaptainPassword?: string;
  playerName?: string;
  playerError?: string;
  statusMessage?: string;
  /** Failed re-check with a previous snapshot: keep the chips, show the warning. */
  refreshError?: boolean;
  globalError?: string;
}

/**
 * The opponent page's per-date chip row: the opponent side's own clash lines,
 * or the clean chip when that side is checked and clean. A date with no clash
 * data renders no clash UI at all — deliberately no venue, accepted/opponent-votable,
 * not-checked, or occupancy chips, and never the organizer side's lines.
 */
function OpponentDateChips(props: {
  date: OpponentDateItem;
  t: TranslateFn;
  locale: AppLocale
}): JSX.Element | null {
  const {date, t, locale} = props;
  if (date.ownClashes === undefined) {
    return null;
  }
  if (date.ownClashes.length === 0) {
    return (
      <div class="date-chips">
        <span class="chip chip--clean">{t('clash_check_clean')}</span>
      </div>
    );
  }
  return (
    <div class="date-chips">
      {date.ownClashes.map((clash) => (
        <span class="chip chip--error" key={`${clash.start}-${clash.opponent}`}>
          {t('clash_line', {
            time: formatLocalizedDateTime(parseIsoToPlainDateTime(clash.start), locale, {timeStyle: 'short'}),
            opponent: clash.opponent,
          })}
        </span>
      ))}
    </div>
  );
}

function DateActions(props: {
  session: Postponement;
  date: OpponentDateItem;
  t: TranslateFn;
  opponentCaptainPassword?: string;
}): JSX.Element {
  const {session, date, t, opponentCaptainPassword} = props;
  return (
    <div class="date-actions">
      <label class="action action--votable action--opponent-votable" title={t('opponent_votable_toggle')}>
        <input
          type="checkbox"
          id={`opponent-votable-${date.id}`}
          hx-post={withOpponentPassword(`/opponent/${session.id}/votable?proposedDateId=${date.id}&opponentVotable=${!date.opponentVotable}`, opponentCaptainPassword)}
          hx-target="#opponent-view"
          checked={date.opponentVotable}
          aria-label={t('opponent_votable_toggle_aria', {date: date.display})}
        />
        {t('opponent_votable')}
      </label>
      <label class="action action--votable action--accepted" title={t('opponent_accepted_toggle')}>
        <input
          type="checkbox"
          id={`opponent-accepted-${date.id}`}
          hx-post={withOpponentPassword(`/opponent/${session.id}/accepted?proposedDateId=${date.id}&accepted=${!date.accepted}`, opponentCaptainPassword)}
          hx-target="#opponent-view"
          checked={date.accepted}
          aria-label={t('opponent_accepted_toggle_aria', {date: date.display})}
        />
        {t('opponent_accepted')}
      </label>
    </div>
  );
}

export function OpponentPage(props: OpponentPageProps): JSX.Element {
  const title = props.title ?? props.t('opponent_title');

  const headingTitle = (
    <span class="redesign-headline">
      <span>{props.opponentTeamName}</span>
    </span>
  );

  const content = (
    <>
      <StatusAnnouncement message={props.statusMessage} isOob={props.isPartial}/>
      <OpponentView {...props}/>
    </>
  );

  return pageLayout(props, content, title, props.globalError, headingTitle);
}

/**
 * The opponent page's in-scope content (`#opponent-view`): the swap target for
 * every opponent mutation, rendered standalone so the partial root matches the
 * target and never nests.
 */
export function OpponentView(props: OpponentPageProps): JSX.Element {
  const rows = sortedRows(props.dates);
  const ownAvailability = new Map(props.dates.map((date) => [date.id, date.yes + date.ifNecessary]));
  const groups = props.sort === 'availability'
                 ? groupByAvailability(rows, ownAvailability, props.t)
                 : groupByWeek(rows, props.locale, props.t);

  return (
    <div id="opponent-view" class="opponent-view">
      <div class="side-block">
        <StatusChip status={props.session.status} t={props.t}/>
      </div>

      <section id="opponent-roster">
        <h2>{props.t('opponent_roster_heading')}</h2>
        <ul class="list" aria-label={props.t('opponent_roster_heading')}>
          {props.players.map((player) => (
            <li key={player.id}>
              <i aria-hidden="true">person</i>
              <div class="max">{player.name}</div>
              <form
                hx-post={withOpponentPassword(`/opponent/${props.session.id}/players`, props.opponentCaptainPassword)}
                hx-target="#opponent-view"
              >
                <input type="hidden" name="playerId" value={player.id}/>
                <button
                  type="submit"
                  class="button small"
                  aria-label={props.t('remove_player_aria_label', {name: player.name})}
                >
                  {props.t('remove_player')}
                </button>
              </form>
            </li>
          ))}
        </ul>
        <form
          hx-post={withOpponentPassword(`/opponent/${props.session.id}/players`, props.opponentCaptainPassword)}
          hx-target="#opponent-view"
          class="mt-4"
        >
          <div class={`field label border fill${props.playerError ? ' invalid' : ''}`}>
            {props.playerError ? (
              <input
                type="text"
                id="playerName"
                name="playerName"
                value={props.playerName}
                autocomplete="off"
                aria-invalid="true"
                aria-describedby="playerName-error"
              />
            ) : (
               <input type="text" id="playerName" name="playerName" required autocomplete="off"/>
             )}
            <label for="playerName">{props.t('new_player_name')}</label>
            {props.playerError
             ? <span id="playerName-error" class="error" role="alert">{props.playerError}</span>
             : null}
          </div>
          <div class="right-align">
            <button type="submit">{props.t('add_player')}</button>
          </div>
        </form>
      </section>

      <section id="opponent-dates">
        <h2>{props.t('proposed_dates_management')}</h2>
        <div class="row items-center gap wrap mt-2">
          {props.refreshCheckable && props.dates.length > 0 ? (
            <button
              type="button"
              class="button outline"
              hx-post={withOpponentPassword(`/opponent/${props.session.id}/refresh-clashes`, props.opponentCaptainPassword)}
              hx-target="#opponent-view"
            >
              <i aria-hidden="true">refresh</i>
              {props.t('clash_check_refresh')}
            </button>
          ) : null}
        </div>
        {props.refreshError ? <p class="error mt-2" role="alert">{props.t('clash_check_refresh_failed')}</p> : null}
        {props.dates.length > 1 ? <SortControl sort={props.sort} t={props.t}
                                               selectUrl={withOpponentPassword(`/opponent/${props.session.id}`, props.opponentCaptainPassword)}
                                               target="#opponent-view"/> : null}
        {props.dates.length === 0 ? (
          <p class="muted mt-2">{props.t('proposed_dates_none')}</p>
        ) : (
           groups.map((group) => (
             <section key={group.key}>
               <h3 class="week-head">
                 <span>{group.label}</span>
                 {group.range ? <span class="week-range">{group.range}</span> : null}
               </h3>
               {group.rows.map((date) => {
                 const dt = parseIsoToPlainDateTime(date.dateTimeRange.start);
                 const hasClashes = date.ownClashes !== undefined && date.ownClashes.length > 0;
                 const isClean = date.ownClashes !== undefined && !hasClashes;
                 const ariaLabel = hasClashes ? props.t('clash_row_label', {date: date.display}) : isClean
                                                                                                   ? props.t('clash_row_clean_label', {date: date.display})
                                                                                                   : undefined;
                 return (
                   <article key={date.id} class={`date-row${hasClashes ? ' clash-row' : ''}`}
                            role={ariaLabel ? 'group' : undefined} aria-label={ariaLabel}>
                     <div class="date-cell">
                       <span class="date-day">{weekdayLabels[props.locale][dt.dayOfWeek - 1] ?? ''}</span>
                       <span class="date-num">{formatLocalizedDateTime(dt, props.locale, {
                         month: 'long',
                         day: 'numeric',
                       })}</span>
                       <span class="date-time">{formatLocalizedDateTime(dt, props.locale, {timeStyle: 'short'})}</span>
                       <span class="date-year">{dt.year}</span>
                     </div>
                     <div class="date-main">
                       <OpponentDateChips date={date} t={props.t} locale={props.locale}/>
                       <span class="team-tally">
                          {props.t('opponent_team_votes', {team: props.opponentTeamName})}: {date.yes +
                         date.ifNecessary} ({date.yes}/{date.ifNecessary}/{date.no})
                       </span>
                       <DateActions
                         session={props.session}
                         date={date}
                         t={props.t}
                         opponentCaptainPassword={props.opponentCaptainPassword}
                       />
                     </div>
                   </article>
                 );
               })}
             </section>
           ))
         )}
      </section>
    </div>
  );
}
