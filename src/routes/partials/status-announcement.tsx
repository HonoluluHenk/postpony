import type { JSX } from 'hono/jsx/jsx-runtime';

export interface StatusAnnouncementProps {
  message?: string;
  isOob?: boolean;
}

/**
 * The shared visually-hidden `role="status"` element for short outcome
 * announcements. The initial edit-page render always carries it (empty);
 * edit partials re-emit it out-of-band with the handler's message. An OOB
 * swap without a message renders nothing — errors keep using the error
 * container instead.
 */
export function StatusAnnouncement(props: StatusAnnouncementProps): JSX.Element | null {
  if (props.isOob && !props.message) {
    return null;
  }
  return (
    <p
      id="clipboard-status"
      class="visually-hidden"
      role="status"
      hx-swap-oob={props.isOob ? 'true' : undefined}
    >
      {props.message ?? ''}
    </p>
  );
}
