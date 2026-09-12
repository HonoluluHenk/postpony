import type { JSX } from 'hono/jsx/jsx-runtime';
import type { PostponementStatus } from '../../../lib/models';
import type { TranslateFn, TranslationKeys } from '../../../locales';

const STATUS_KEYS: Record<PostponementStatus, TranslationKeys> = {
  Draft: 'status_draft',
  Voting: 'status_voting',
  Confirmed: 'status_confirmed',
};

export interface StatusChipProps {
  status: PostponementStatus;
  t: TranslateFn;
  oob?: boolean;
}

export function StatusChip(props: StatusChipProps): JSX.Element {
  return (
    <p class="chip outline" id="status-chip" hx-swap-oob={props.oob ? 'true' : undefined}>
      {props.t('status_label', {status: props.t(STATUS_KEYS[props.status])})}
    </p>
  );
}
