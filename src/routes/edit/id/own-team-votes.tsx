import type { JSX } from 'hono/jsx/jsx-runtime';
import { Fragment } from 'hono/jsx';
import type { Vote } from '../../../lib/models';
import type { TranslateFn, TranslationKeys } from '../../../locales';
import type { OwnTeamView } from './own-team-view';

export const VOTE_KEYS: Record<Vote['type'], TranslationKeys> = {
  Yes: 'vote_yes',
  No: 'vote_no',
  IfNecessary: 'vote_if_necessary',
};

export interface OwnTeamVotesProps extends OwnTeamView {
  t: TranslateFn;
}

/**
 * The organizer team's per-player votes per Proposed Date, collapsed into a
 * native disclosure (closed by default). Restored after the redesign replaced
 * the tallies with inline dots; it carries the per-player detail the dots
 * summarise.
 */
export function OwnTeamVotes(props: OwnTeamVotesProps): JSX.Element | null {
  if (props.ownTeamResults.length === 0) {
    return null;
  }

  const title = props.t('own_team_votes');

  return (
    <details id="own-team-votes" class="votes-details">
      <summary>{title}</summary>
      <table>
        <caption class="visually-hidden">{title}</caption>
        <thead>
          <tr>
            <th scope="col">{props.t('proposed_date_time_label')}</th>
            {props.organizerPlayers.map((player) => (
              <th scope="col" key={player.id}>{player.name}</th>
            ))}
            <th scope="col" class="num">{props.t('voted_column')}</th>
          </tr>
        </thead>
        <tbody>
          {props.ownTeamResults.map((dateResult) => (
            <Fragment key={dateResult.dateId}>
              <tr>
                <th scope="row">{dateResult.display}</th>
                {dateResult.votes.map((cell) => (
                  <td data-label={cell.playerName}>
                    {cell.vote
                      ? props.t(VOTE_KEYS[cell.vote])
                      : (
                        <>
                          <span class="visually-hidden">{props.t('no_vote')}</span>
                          <span aria-hidden="true">–</span>
                        </>
                      )}
                  </td>
                ))}
                <td data-label={props.t('voted_column')} class="num">
                  {props.t('voted_count', {voted: String(dateResult.voted), total: String(dateResult.total)})}
                </td>
              </tr>
              {dateResult.nonVoters.length > 0 ? (
                <tr>
                  <td colspan={dateResult.votes.length + 2}>
                    {props.t('non_voters')}{' '}
                    {dateResult.nonVoters.map((nonVoter, index) => (
                      <Fragment key={nonVoter.playerId}>
                        {index > 0 ? ', ' : null}
                        {nonVoter.playerName}
                        {!nonVoter.joined ? ` (${props.t('not_joined')})` : null}
                      </Fragment>
                    ))}
                  </td>
                </tr>
              ) : null}
            </Fragment>
          ))}
        </tbody>
      </table>
    </details>
  );
}
