import type { JSX } from 'hono/jsx/jsx-runtime';
import type { TranslateFn, TranslationKeys } from '../../locales';
import { VoteTally, type ProposedDateTally } from './vote-tally';

export interface PlayerVoteRow {
  playerName: string;
  votes: readonly (string | null | undefined)[];
}

export interface VotePlayerResultsProps {
  proposedDates: readonly ProposedDateTally[];
  playerVoteRows: readonly PlayerVoteRow[];
  t: TranslateFn;
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
  titleId?: string;
  title?: string;
}

export function VotePlayerResults(props: VotePlayerResultsProps): JSX.Element | null {
  if (props.proposedDates.length === 0) {
    return null;
  }

  const level = props.headingLevel ?? 3;
  const Heading = `h${level}` as const;
  const titleId = props.titleId ?? 'vote-results-title';
  const title = props.title ?? props.t('your_team_votes');

  return (
    <>
      <Heading id={titleId}>{title}</Heading>
      <table>
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope="col">{props.t('players')}</th>
            {props.proposedDates.map((pd) => (
              <th scope="col">{pd.display}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {props.playerVoteRows.map((row) => (
            <tr>
              <th scope="row">{row.playerName}</th>
              {row.votes.map((vote, idx) => (
                <td data-label={props.proposedDates[idx]?.display}>
                  {vote ? props.t(`vote_${vote.toLowerCase()}` as TranslationKeys) : props.t('no_vote')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <VoteTally
        proposedDates={props.proposedDates}
        t={props.t}
        headingLevel={4}
        titleId="vote-tally-title"
        title={props.t('vote_summary')}
      />
    </>
  );
}
