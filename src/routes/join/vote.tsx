import type { JSX } from 'hono/jsx/jsx-runtime';
import { raw } from 'hono/utils/html';
import type { ViewContext } from '../../app';
import type { TranslateFn } from '../../locales';
import type { Venue, VoteTallyItem } from '../../lib/models';
import type { VenueOccupancy } from '../../lib/venue-occupancy';
import { defaultVenueNumber } from '../../lib/venues';
import { pageLayout } from '../layouts/main';
import { groupByWeek, RailGroupHeading } from '../partials/sort-control';
import { SwitchParticipantLink } from '../partials/switch-participant';
import { VenueChip } from '../partials/venues';
import { VoteTally } from '../partials/vote-tally';
import type { Team } from './join-utils';

export interface VotePageDate extends VoteTallyItem {
  dateTimeRange: {
    start: string
  };
  currentVote: string;
  /** venue number the date applies to; absent means venue 1 (legacy dates predate venues). */
  venueNumber?: number;
  /** Venue Occupancy snapshot from the last check; absent when never checked, the scrape failed, or the session has no club id. */
  venueOccupancy?: VenueOccupancy;
}

export interface VotePageProps extends ViewContext {
  title?: string;
  sessionId: string;
  team: Team;
  token: string;
  playerId: string;
  proposedDates: readonly VotePageDate[];
  venues: readonly Venue[];
  updated?: boolean;
  globalError?: string;
}

/** The occupancy clause appended to a date's venue chip; absent on no/empty data. */
function occupancyClause(date: VotePageDate, t: TranslateFn): string | undefined {
  return date.venueOccupancy !== undefined && date.venueOccupancy.count > 0
         ? date.venueOccupancy.count === 1
           ? t('venue_legend_occupancy_one')
           : t('venue_legend_occupancy', {count: String(date.venueOccupancy.count)})
         : undefined;
}

/**
 * The swap target of an HTMX vote save: the saved-toast, the calendar export
 * link, the vote form and the shared tally. Rendered inside `VotePage` on a full
 * load and on its own for the partial swap, so an AJAX save replaces exactly
 * what changes without touching the page heading.
 */
export function VoteRegion(props: VotePageProps): JSX.Element {
  const action = `/join/${props.sessionId}/${props.team}/vote?playerId=${props.playerId}&token=${props.token}`;
  const groups = groupByWeek(props.proposedDates, props.locale, props.t);

  return (
    <div id="vote-region">
      {props.updated ? (
        <div class="toast success top" role="status">
          <i aria-hidden="true">check_circle</i>
          <div class="max">
            <p>{props.t('vote_updated')}</p>
          </div>
        </div>
      ) : null}

      {props.proposedDates.length > 0 ? (
        <a
          class="button outline"
          href={`${props.baseUrl}/join/${props.sessionId}/${props.team}/calendar.ics?token=${props.token}&playerId=${props.playerId}`}
          hx-boost="false"
          data-no-spinner
        >
          <i aria-hidden="true">download</i>
          {props.t('export_calendar')}
        </a>
      ) : null}

      {props.proposedDates.length === 0 ? (
        <p>{props.t('vote_no_dates')}</p>
      ) : (
         <>
           <form
             method="post"
             action={action}
             hx-post={action}
             hx-target="#vote-region"
             hx-swap="outerHTML"
             aria-label={props.t('vote_title')}
           >
             <fieldset class="vote-set-all">
               <legend>{props.t('vote_set_all')}</legend>
               <div class="row wrap">
                 <div class="vote-option">
                   <button
                     type="button"
                     class="button"
                     data-set-all="Yes"
                     aria-label={props.t('vote_set_all_aria_label', {vote: props.t('vote_yes')})}
                     aria-describedby="set-all-yes-tooltip"
                   >
                     {props.t('vote_yes')}
                   </button>
                   <span class="tooltip" role="tooltip" id="set-all-yes-tooltip">{props.t('vote_yes_tooltip')}</span>
                 </div>
                 <div class="vote-option">
                   <button
                     type="button"
                     class="button"
                     data-set-all="IfNecessary"
                     aria-label={props.t('vote_set_all_aria_label', {vote: props.t('vote_if_necessary')})}
                     aria-describedby="set-all-ifnecessary-tooltip"
                   >
                     {props.t('vote_if_necessary')}
                   </button>
                   <span class="tooltip" role="tooltip"
                         id="set-all-ifnecessary-tooltip">{props.t('vote_if_necessary_tooltip')}</span>
                 </div>
                 <div class="vote-option">
                   <button
                     type="button"
                     class="button"
                     data-set-all="No"
                     aria-label={props.t('vote_set_all_aria_label', {vote: props.t('vote_no')})}
                     aria-describedby="set-all-no-tooltip"
                   >
                     {props.t('vote_no')}
                   </button>
                   <span class="tooltip" role="tooltip" id="set-all-no-tooltip">{props.t('vote_no_tooltip')}</span>
                 </div>
               </div>
             </fieldset>

             {groups.map((group) => {
               const first = group.rows[0];
               const uniformVenue = first !== undefined && group.rows.every(
                 (row) => defaultVenueNumber(row.venueNumber) === defaultVenueNumber(first.venueNumber),
               );
               const sharedClause = uniformVenue && group.rows.every(
                 (row) => occupancyClause(row, props.t) === occupancyClause(first, props.t),
               )
                                    ? occupancyClause(first, props.t)
                                    : undefined;
               return (
                 <section class="vote-week" key={group.key}>
                   <RailGroupHeading
                     group={group}
                     t={props.t}
                     trailing={uniformVenue ? (
                       <VenueChip venueNumber={first.venueNumber} venues={props.venues} extra={sharedClause}/>
                     ) : undefined}
                   />
                   {group.rows.map((pd) => (
                     <fieldset class="field border radio-group vote-radio-group" key={pd.id}>
                       <legend>
                         {pd.display}
                         {uniformVenue ? null : (
                           <>
                             {' '}
                             <VenueChip
                               venueNumber={pd.venueNumber}
                               venues={props.venues}
                               extra={occupancyClause(pd, props.t)}
                             />
                           </>
                         )}
                       </legend>
                       <div class="vote-option">
                         <label class="radio">
                           <input
                             type="radio"
                             name={`vote-${pd.id}`}
                             value="Yes"
                             checked={pd.currentVote === 'Yes'}
                             aria-describedby={`vote-yes-${pd.id}-tooltip`}
                           />
                           <span>{props.t('vote_yes')}</span>
                         </label>
                         <span class="tooltip" role="tooltip"
                               id={`vote-yes-${pd.id}-tooltip`}>{props.t('vote_yes_tooltip')}</span>
                       </div>
                       <div class="vote-option">
                         <label class="radio">
                           <input
                             type="radio"
                             name={`vote-${pd.id}`}
                             value="IfNecessary"
                             checked={pd.currentVote === 'IfNecessary'}
                             aria-describedby={`vote-ifnecessary-${pd.id}-tooltip`}
                           />
                           <span>{props.t('vote_if_necessary')}</span>
                         </label>
                         <span class="tooltip" role="tooltip"
                               id={`vote-ifnecessary-${pd.id}-tooltip`}>{props.t('vote_if_necessary_tooltip')}</span>
                       </div>
                       <div class="vote-option">
                         <label class="radio">
                           <input
                             type="radio"
                             name={`vote-${pd.id}`}
                             value="No"
                             checked={pd.currentVote === 'No'}
                             aria-describedby={`vote-no-${pd.id}-tooltip`}
                           />
                           <span>{props.t('vote_no')}</span>
                         </label>
                         <span class="tooltip" role="tooltip"
                               id={`vote-no-${pd.id}-tooltip`}>{props.t('vote_no_tooltip')}</span>
                       </div>
                     </fieldset>
                   ))}
                 </section>
               );
             })}
           </form>

           <section aria-labelledby="vote-summary-title">
             <VoteTally
               proposedDates={props.proposedDates}
               t={props.t}
               headingLevel={3}
               titleId="vote-summary-title"
             />
           </section>
         </>
       )}
    </div>
  );
}

export function VotePage(props: VotePageProps): JSX.Element {
  const title = props.title ?? props.t('vote_title');

  const content = (
    <>
      <header>
        <h2>{props.t('vote_availability_heading')}</h2>
      </header>

      {props.proposedDates.length > 0 ? (
        <>
          {/* ponytail: markup lives in the locale string (ul/strong), labels are
           our own literals, so raw() cannot carry user-typed HTML. */}
          {raw(props.t('vote_intro', {
            yes: props.t('vote_yes'),
            no: props.t('vote_no'),
            ifNecessary: props.t('vote_if_necessary'),
          }))}
          <p>{raw(props.t('vote_calendar_hint'))}</p>
        </>
      ) : null}

      <VoteRegion {...props}/>

      <SwitchParticipantLink sessionId={props.sessionId} team={props.team} token={props.token} t={props.t}/>

      {/* ponytail: sessionId/team/playerId are generated or validated server-side, so
       raw() interpolation cannot carry user-typed markup; upgrade to a data
       attribute if that invariant ever changes. */}
      {raw(`<script>
  window.localStorage.setItem('postpony-player-${props.sessionId}-${props.team}', '${props.playerId}');
</script>`)}
    </>
  );

  return pageLayout(props, content, title, props.globalError);
}
