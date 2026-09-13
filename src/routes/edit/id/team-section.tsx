import type { JSX } from 'hono/jsx/jsx-runtime';
import type { Player, Team } from '../../../lib/models';
import type { TranslateFn } from '../../../locales';
import type { OwnTeamView } from './own-team-view';

export interface TeamSectionProps extends OwnTeamView {
  sessionId: string;
  players: Player[];
  t: TranslateFn;
  playerName?: string;
  teamId?: Team;
  error?: string;
}

export function TeamSection(props: TeamSectionProps): JSX.Element {
  const homeInvalid = (!props.teamId || props.teamId === 'home') && !!props.error;
  const awayInvalid = props.teamId === 'away' && !!props.error;
  const homePlayers = props.players.filter((player) => player.teamId === 'home');
  const awayPlayers = props.players.filter((player) => player.teamId === 'away');

  return (
    <div id="team-management">
      <h4>{props.t('home_team')}</h4>
      <ul id="home-player-list" class="list" aria-label={props.t('home_team')}>
        {homePlayers.map((player) => (
          <li key={player.id}>
            <i aria-hidden="true">person</i>
            <div class="max">{player.name}</div>
          </li>
        ))}
      </ul>
      <form hx-post={`/edit/${props.sessionId}/players`} hx-target="#edit-grid" class="mt-4">
        <input type="hidden" name="teamId" value="home" />
        <div class={`field label border fill${homeInvalid ? ' invalid' : ''}`}>
          {homeInvalid ? (
            <input
              type="text"
              id="playerName"
              name="playerName"
              value={props.playerName}
              autocomplete="off"
              aria-invalid="true"
              aria-describedby="playerName-error"
            />
          ) : (
            <input type="text" id="playerName" name="playerName" required autocomplete="off" />
          )}
          <label for="playerName">{props.t('new_player_name')}</label>
          {homeInvalid ? <span id="playerName-error" class="error" role="alert">{props.error}</span> : null}
        </div>
        <div class="right-align">
          <button type="submit">{props.t('add_player')}</button>
        </div>
      </form>

      <h4>{props.t('away_team')}</h4>
      <ul id="away-player-list" class="list" aria-label={props.t('away_team')}>
        {awayPlayers.map((player) => (
          <li key={player.id}>
            <i aria-hidden="true">person</i>
            <div class="max">{player.name}</div>
          </li>
        ))}
      </ul>
      <form hx-post={`/edit/${props.sessionId}/players`} hx-target="#edit-grid" class="mt-4">
        <input type="hidden" name="teamId" value="away" />
        <div class={`field label border fill${awayInvalid ? ' invalid' : ''}`}>
          {awayInvalid ? (
            <input
              type="text"
              id="playerNameAway"
              name="playerName"
              value={props.playerName}
              autocomplete="off"
              aria-invalid="true"
              aria-describedby="playerNameAway-error"
            />
          ) : (
            <input type="text" id="playerNameAway" name="playerName" required autocomplete="off" />
          )}
          <label for="playerNameAway">{props.t('new_player_name')}</label>
          {awayInvalid ? <span id="playerNameAway-error" class="error" role="alert">{props.error}</span> : null}
        </div>
        <div class="right-align">
          <button type="submit">{props.t('add_player')}</button>
        </div>
      </form>
    </div>
  );
}
