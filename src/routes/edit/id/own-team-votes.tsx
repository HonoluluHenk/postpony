import type { JSX } from 'hono/jsx/jsx-runtime';
import { Fragment } from 'hono/jsx';
import type { TranslateFn, TranslationKeys } from '../../../locales';
import type { OwnTeamView } from './own-team-view';

export interface OwnTeamVotesProps extends OwnTeamView {
  t: TranslateFn;
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
  title?: string;
  oob?: boolean;
}

export function OwnTeamVotes(props: OwnTeamVotesProps): JSX.Element | null {
  if (props.ownTeamResults.length === 0) {
    // The partial must still emit the OOB target so a swap clears a stale
    // section after the last proposed date is deleted; the cold page has no
    // stale node to clear, so it collapses to nothing instead.
    if (props.oob) {
      return <section id="own-team-votes" hx-swap-oob="true" hidden />;
    }
    return null;
  }

  const level = props.headingLevel ?? 3;
  const Heading = `h${level}` as const;
  const title = props.title ?? props.t('own_team_votes');

  return (
    <section
      id="own-team-votes"
      class="padding small-round surface-variant"
      hx-swap-oob={props.oob ? 'true' : undefined}
      aria-labelledby="own-team-votes-title"
      aria-live="polite"
    >
      <header>
        <Heading id="own-team-votes-title">{title}</Heading>
      </header>
      <table>
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope="col">{props.t('proposed_date_time_label')}</th>
            {props.organizerPlayers.map((player) => (
              <th scope="col">{player.name}</th>
            ))}
            <th scope="col">{props.t('voted_column')}</th>
          </tr>
        </thead>
        <tbody>
          {props.ownTeamResults.map((dateResult) => (
            <Fragment key={dateResult.dateId}>
              <tr>
                <th scope="row">{dateResult.display}</th>
                {dateResult.votes.map((cell) => (
                  <td>
                    {cell.vote
                      ? props.t(`vote_${cell.vote.toLowerCase()}` as TranslationKeys)
                      : (
                        <>
                          <span class="visually-hidden">{props.t('no_vote')}</span>
                          <span aria-hidden="true">–</span>
                        </>
                      )}
                  </td>
                ))}
                <td>
                  {props.t('voted_count', {
                    voted: String(dateResult.voted),
                    total: String(dateResult.total),
                  })}
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
    </section>
  );
}
