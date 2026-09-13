import type { JSX } from 'hono/jsx/jsx-runtime';
import type { TranslateFn } from '../../locales';

export interface ProposedDateTally {
  display: string;
  yes: number;
  ifNecessary: number;
  no: number;
}

export interface VoteTallyProps {
  proposedDates: readonly ProposedDateTally[];
  t: TranslateFn;
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
  titleId?: string;
  title?: string;
  /** When true, the tally collapses into a native disclosure (details/summary)
   * with the heading as the summary, closed by default. The join vote page keeps
   * the always-open variant (no prop). */
  disclosure?: boolean;
}

export function VoteTally(props: VoteTallyProps): JSX.Element | null {
  if (props.proposedDates.length === 0) {
    return null;
  }

  const level = props.headingLevel ?? 3;
  const Heading = `h${level}` as const;
  const titleId = props.titleId ?? 'vote-tally-title';
  const title = props.title ?? props.t('vote_summary');

  const heading = <Heading id={titleId}>{title}</Heading>;

  const table = (
    <table>
      <caption class="visually-hidden">{title}</caption>
      <thead>
        <tr>
          <th scope="col">{props.t('proposed_date_time_label')}</th>
          <th scope="col" class="num">{props.t('vote_yes')}</th>
          <th scope="col" class="num">{props.t('vote_if_necessary')}</th>
          <th scope="col" class="num">{props.t('vote_no')}</th>
        </tr>
      </thead>
      <tbody>
        {props.proposedDates.map((pd) => (
          <tr>
            <td data-label={props.t('proposed_date_time_label')}>{pd.display}</td>
            <td data-label={props.t('vote_yes')} class="num">{pd.yes}</td>
            <td data-label={props.t('vote_if_necessary')} class="num">{pd.ifNecessary}</td>
            <td data-label={props.t('vote_no')} class="num">{pd.no}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  if (props.disclosure) {
    return (
      <details>
        <summary>{heading}</summary>
        {table}
      </details>
    );
  }

  return (
    <>
      {heading}
      {table}
    </>
  );
}
