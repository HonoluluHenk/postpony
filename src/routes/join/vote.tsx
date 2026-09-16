import type { JSX } from 'hono/jsx/jsx-runtime';
import { raw } from 'hono/utils/html';
import type { ViewContext } from '../../app';
import type { Venue, VoteTallyItem } from '../../lib/models';
import type { VenueOccupancy } from '../../lib/venue-occupancy';
import { pageLayout } from '../layouts/main';
import { VenueChip } from '../partials/venues';
import { VoteTally } from '../partials/vote-tally';
import type { Team } from './join-utils';

export interface VotePageDate extends VoteTallyItem {
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

/**
 * The swap target of an HTMX vote save: the saved-toast, the calendar export
 * link, the vote form and the shared tally. Rendered inside `VotePage` on a full
 * load and on its own for the partial swap, so an AJAX save replaces exactly
 * what changes without touching the page heading.
 */
export function VoteRegion(props: VotePageProps): JSX.Element {
  const action = `/join/${props.sessionId}/${props.team}/vote?playerId=${props.playerId}&token=${props.token}`;

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
                 <button
                   type="button"
                   class="button"
                   data-set-all="Yes"
                   aria-label={props.t('vote_set_all_aria_label', {vote: props.t('vote_yes')})}
                 >
                   {props.t('vote_yes')}
                 </button>
                 <button
                   type="button"
                   class="button"
                   data-set-all="IfNecessary"
                   aria-label={props.t('vote_set_all_aria_label', {vote: props.t('vote_if_necessary')})}
                 >
                   {props.t('vote_if_necessary')}
                 </button>
                 <button
                   type="button"
                   class="button"
                   data-set-all="No"
                   aria-label={props.t('vote_set_all_aria_label', {vote: props.t('vote_no')})}
                 >
                   {props.t('vote_no')}
                 </button>
               </div>
             </fieldset>

             {props.proposedDates.map((pd) => (
               <fieldset class="field border radio-group vote-radio-group" key={pd.id}>
                 <legend>
                   {pd.display}{' '}
                   <VenueChip
                     venueNumber={pd.venueNumber}
                     venues={props.venues}
                     extra={pd.venueOccupancy !== undefined && pd.venueOccupancy.count > 0
                            ? pd.venueOccupancy.count === 1
                              ? props.t('venue_legend_occupancy_one')
                              : props.t('venue_legend_occupancy', {count: String(pd.venueOccupancy.count)})
                            : undefined}
                   />
                 </legend>
                 <label class="radio">
                   <input
                     type="radio"
                     name={`vote-${pd.id}`}
                     value="Yes"
                     checked={pd.currentVote === 'Yes'}
                   />
                   <span>{props.t('vote_yes')}</span>
                 </label>
                 <label class="radio">
                   <input
                     type="radio"
                     name={`vote-${pd.id}`}
                     value="IfNecessary"
                     checked={pd.currentVote === 'IfNecessary'}
                   />
                   <span>{props.t('vote_if_necessary')}</span>
                 </label>
                 <label class="radio">
                   <input
                     type="radio"
                     name={`vote-${pd.id}`}
                     value="No"
                     checked={pd.currentVote === 'No'}
                   />
                   <span>{props.t('vote_no')}</span>
                 </label>
               </fieldset>
             ))}
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
        <h2>{title}</h2>
      </header>

      <VoteRegion {...props}/>

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
