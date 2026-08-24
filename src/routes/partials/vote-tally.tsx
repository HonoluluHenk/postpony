import type { JSX } from 'hono/jsx/jsx-runtime';
import type { TranslateFn } from '../../locales';

export interface ProposedDateTally {
  display: string;
  yes: number;
  maybe: number;
  no: number;
}

export interface VoteTallyProps {
  proposedDates: readonly ProposedDateTally[];
  t: TranslateFn;
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
  titleId?: string;
  title?: string;
}

export function VoteTally(props: VoteTallyProps): JSX.Element | null {
  if (props.proposedDates.length === 0) {
    return null;
  }

  const level = props.headingLevel ?? 3;
  const Heading = `h${level}` as const;
  const titleId = props.titleId ?? 'vote-tally-title';
  const title = props.title ?? props.t('vote_summary');

  return (
    <>
      <Heading id={titleId}>{title}</Heading>
      <table>
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope="col">{props.t('proposed_date_time_label')}</th>
            <th scope="col">{props.t('vote_yes')}</th>
            <th scope="col">{props.t('vote_maybe')}</th>
            <th scope="col">{props.t('vote_no')}</th>
          </tr>
        </thead>
        <tbody>
          {props.proposedDates.map((pd) => (
            <tr>
              <td data-label={props.t('proposed_date_time_label')}>{pd.display}</td>
              <td data-label={props.t('vote_yes')}>{pd.yes}</td>
              <td data-label={props.t('vote_maybe')}>{pd.maybe}</td>
              <td data-label={props.t('vote_no')}>{pd.no}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
