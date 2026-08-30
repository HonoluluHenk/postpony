import type { JSX } from 'hono/jsx/jsx-runtime';
import { raw } from 'hono/utils/html';
import type { ViewContext } from '../../app';
import type { DateClashes } from '../../lib/clashes';
import type { Venue, Vote, VoteTallyItem } from '../../lib/models';
import { pageLayout } from '../layouts/main';
import { ClashInfo } from '../partials/clash-info';
import { VenueBadge } from '../partials/venue-badge';
import { VotePlayerResults } from '../partials/vote-player-results';
import type { Team } from './join-utils';

export interface VotePageDate extends VoteTallyItem {
  currentVote: string;
  clashes?: DateClashes;
  /** venue number the date applies to; absent means venue 1 (legacy dates predate venues). */
  venueNumber?: number;
}

export interface PlayerVoteRow {
  playerName: string;
  votes: readonly (Vote['type'] | null)[];
}

export interface VotePageProps extends ViewContext {
  title?: string;
  sessionId: string;
  team: Team;
  token: string;
  playerId: string;
  playerName: string;
  proposedDates: readonly VotePageDate[];
  playerVoteRows: readonly PlayerVoteRow[];
  clashCheckable: boolean;
  venues: readonly Venue[];
  updated?: boolean;
  globalError?: string;
}

export function VotePage(props: VotePageProps): JSX.Element {
  const title = props.title ?? props.t('vote_title');

  const content = (
    <>
      <header>
        <h2>{title}</h2>
      </header>

      {props.updated ? (
        <div class="toast success top" role="alert">
          <i aria-hidden="true">check_circle</i>
          <div class="max">
            <p>{props.t('vote_updated')}</p>
          </div>
        </div>
      ) : null}

      {props.proposedDates.length === 0 ? (
        <p>{props.t('vote_no_dates')}</p>
      ) : (
        <>
          <form
            method="post"
            action={`/join/${props.sessionId}/${props.team}/vote?playerId=${props.playerId}&token=${props.token}`}
            hx-boost="false"
            aria-label={props.t('vote_title')}
          >
            {props.proposedDates.map((pd) => (
              <fieldset class="field border radio-group vote-radio-group" key={pd.id}>
                <legend>{pd.display} <VenueBadge venueNumber={pd.venueNumber} venues={props.venues}/></legend>
                <ClashInfo
                  clashes={pd.clashes}
                  clashCheckable={props.clashCheckable}
                  t={props.t}
                  locale={props.locale}
                />
                <label class="radio">
                  <input
                    type="radio"
                    name={`vote-${pd.id}`}
                    value="Yes"
                    checked={pd.currentVote === 'Yes'}
                    required
                  />
                  <span>{props.t('vote_yes')}</span>
                </label>
                <label class="radio">
                  <input
                    type="radio"
                    name={`vote-${pd.id}`}
                    value="Maybe"
                    checked={pd.currentVote === 'Maybe'}
                  />
                  <span>{props.t('vote_maybe')}</span>
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

            <div class="right-align">
              <button type="submit">{props.t('vote_submit')}</button>
            </div>
          </form>

          <section aria-labelledby="vote-results-title">
            <VotePlayerResults
              proposedDates={props.proposedDates}
              playerVoteRows={props.playerVoteRows}
              t={props.t}
              headingLevel={3}
              titleId="vote-results-title"
              title={props.t('your_team_votes')}
            />
          </section>
        </>
      )}

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
