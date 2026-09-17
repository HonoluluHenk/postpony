import type { JSX } from 'hono/jsx/jsx-runtime';
import { raw } from 'hono/utils/html';
import type { TranslateFn } from '../../locales';
import type { Team } from '../join/join-utils';

/**
 * The switch-participant control: drops this device's participant identity for
 * the postponement+team and navigates to the register step, so a different
 * roster player can join. Client-side only — identity is a device-local
 * localStorage playerId (ADR-0013), there is no server session to end. Votes
 * already cast stay with the outgoing participant.
 */
export function SwitchParticipantLink(props: {
  sessionId: string;
  team: Team;
  token: string;
  t: TranslateFn;
}): JSX.Element {
  const href = `/join/${props.sessionId}/${props.team}?token=${encodeURIComponent(props.token)}`;

  return (
    <p class="right-align">
      <a id="switch-participant" class="button outline" href={href} hx-boost="false">
        {props.t('vote_switch_player')}
      </a>
      {/* ponytail: interpolated values are a generated id and a validated team,
       never user-typed text; if a prop here ever becomes editable, move it
       out of raw(). The listener does not preventDefault: clearing storage
       and following the link is one atomic default navigation. */}
      {raw(`<script>
  (function () {
    document.getElementById('switch-participant').addEventListener('click', function () {
      window.localStorage.removeItem('postpony-player-${props.sessionId}-${props.team}');
    });
  })();
</script>`)}
    </p>
  );
}
