import type { JSX } from 'hono/jsx/jsx-runtime';
import { raw } from 'hono/utils/html';
import type { ViewContext } from '../../app';
import type { Player } from '../../lib/models';
import { pageLayout } from '../layouts/main';
import { pendingVoteQuery, type PendingVote, type Team } from './join-utils';

export interface JoinPageProps extends ViewContext {
  title?: string;
  sessionId: string;
  team: Team;
  token: string;
  players: readonly Player[];
  error?: string;
  globalError?: string;
  /** Pending vote-<dateId>=<value> intent carried through the register step. */
  pendingVotes?: readonly PendingVote[];
}

export function JoinPage(props: JoinPageProps): JSX.Element {
  const title = props.title ?? props.t('join_title');
  const pendingVotes = props.pendingVotes ?? [];
  const pendingQuery = pendingVoteQuery(pendingVotes);
  const action = `/join/${props.sessionId}/${props.team}/register?token=${props.token}` +
    (pendingQuery ? `&${pendingQuery}` : '');

  const content = (
    <>
      <header>
        <h2>{title}</h2>
      </header>

      {props.error ? (
        <div id="join-error" class="error padding white-text" role="alert">
          <i aria-hidden="true">error</i>
          <div class="max">
            <p>{props.error}</p>
          </div>
        </div>
      ) : null}

      <form
        method="post"
        action={action}
        hx-boost="false"
      >
        {props.players.length > 0 ? (
          <>
            <fieldset class="field border radio-group">
              <legend>{props.t('join_select_player')}</legend>
              {props.players.map((player) => (
                <label class="radio" key={player.id}>
                  <input type="radio" name="playerId" value={player.id} />
                  <span>{player.name}</span>
                </label>
              ))}
            </fieldset>

            <p>{props.t('join_or_new')}</p>
          </>
        ) : null}

        <div class={`field label border${props.error ? ' invalid' : ''}`}>
          <input
            type="text"
            id="newPlayerName"
            name="newPlayerName"
            autocomplete="name"
            aria-invalid={props.error ? 'true' : undefined}
            aria-describedby={props.error ? 'join-error' : undefined}
          />
          <label for="newPlayerName">{props.t('join_new_player')}</label>
        </div>

        <div class="right-align">
          <button type="submit">{props.t('join_continue')}</button>
        </div>
      </form>

      {/* ponytail: interpolated values are a generated id and a validated team, never
          user-typed text; if a prop here ever becomes editable, move it out of raw(). */}
      {raw(`<script>
  (function () {
    var stored = window.localStorage.getItem('postpony-player-${props.sessionId}-${props.team}');
    if (stored) {
      var params = new URLSearchParams(window.location.search);
      var parts = [];
      params.forEach(function (value, key) {
        if (key.indexOf('vote-') === 0) parts.push(key + '=' + encodeURIComponent(value));
      });
      var pending = parts.length ? '&' + parts.join('&') : '';
      window.location.replace(
        '/join/${props.sessionId}/${props.team}/vote?playerId=' + encodeURIComponent(stored) +
        '&token=' + encodeURIComponent(params.get('token') || '') + pending
      );
    }
  })();
</script>`)}
    </>
  );

  return pageLayout(props, content, title, props.globalError);
}
