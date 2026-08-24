import type { JSX } from 'hono/jsx/jsx-runtime';
import type { VoteTallyItem } from '../../../lib/models';
import type { TranslateFn } from '../../../locales';
import { VoteTally } from '../../partials/vote-tally';

export interface VoteTallySectionProps {
  homeProposedDates: readonly VoteTallyItem[];
  awayProposedDates: readonly VoteTallyItem[];
  t: TranslateFn;
  oob?: boolean;
}

// ponytail: the section cards collapse when empty, but the #vote-tally-section
// grid div always renders because it is the hx-swap-oob target; dropping it
// would leave a stale tally on screen after deleting the last proposed date.
export function VoteTallySection(props: VoteTallySectionProps): JSX.Element {
  return (
    <div id="vote-tally-section" hx-swap-oob={props.oob ? 'true' : undefined} class="grid" aria-live="polite">
      {props.homeProposedDates.length > 0 ? (
        <section class="padding small-round surface-variant s12 m6" aria-labelledby="vote-summary-home-title">
          <VoteTally
            proposedDates={props.homeProposedDates}
            t={props.t}
            headingLevel={3}
            titleId="vote-summary-home-title"
            title={props.t('vote_summary_home')}
          />
        </section>
      ) : null}
      {props.awayProposedDates.length > 0 ? (
        <section class="padding small-round surface-variant s12 m6" aria-labelledby="vote-summary-away-title">
          <VoteTally
            proposedDates={props.awayProposedDates}
            t={props.t}
            headingLevel={3}
            titleId="vote-summary-away-title"
            title={props.t('vote_summary_away')}
          />
        </section>
      ) : null}
    </div>
  );
}
