import type { JSX } from 'hono/jsx/jsx-runtime';
import type { PostponementStatus } from '../../../lib/models';
import type { TranslateFn } from '../../../locales';

export interface StatusChipProps {
  status: PostponementStatus;
  t: TranslateFn;
  oob?: boolean;
}

export function StatusChip(props: StatusChipProps): JSX.Element {
  return (
    <p class="chip outline" id="status-chip" hx-swap-oob={props.oob ? 'true' : undefined}>
      {props.t('status_label', {status: props.status})}
    </p>
  );
}
