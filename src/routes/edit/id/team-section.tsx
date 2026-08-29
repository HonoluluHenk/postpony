import type { JSX } from 'hono/jsx/jsx-runtime';
import type { App } from '../../../app';
import type { Player, Postponement, Team } from '../../../lib/models';
import type { TranslateFn } from '../../../locales';
import { ErrorContainer } from '../../partials/error-container';
import { buildOwnTeamView, type OwnTeamView } from './own-team-view';
import { OwnTeamVotes } from './own-team-votes';

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

  return (
    <section id="team-management" class="padding small-round surface-variant s12 m4" aria-live="polite">
      <header>
        <h3 tabindex={-1}>{props.t('players')}</h3>
      </header>

      <h4>{props.t('home_team')}</h4>
      <ul id="home-player-list" class="list" aria-label={props.t('home_team')}>
        {props.players
          .filter((player) => player.teamId === 'home')
          .map((player) => (
            <li key={player.id}>
              <i aria-hidden="true">person</i>
              <div class="max">{player.name}</div>
            </li>
          ))}
      </ul>
      <form
        hx-post={`/edit/${props.sessionId}/players`}
        hx-target="#team-management"
        class="mt-4"
        {...{['hx-on::after-request']: "focusAfterSwap('#team-management')"}}
      >
        <input type="hidden" name="teamId" value="home" />
        <div class={`field label border fill${homeInvalid ? ' invalid' : ''}`}>
          {homeInvalid ? (
            <input
              type="text"
              id="playerName"
              name="playerName"
              value={props.playerName}
              aria-invalid="true"
              aria-describedby="playerName-error"
            />
          ) : (
            <input type="text" id="playerName" name="playerName" required />
          )}
          <label for="playerName">{props.t('new_player_name')}</label>
          {homeInvalid ? (
            <span id="playerName-error" class="error" role="alert">{props.error}</span>
          ) : null}
        </div>
        <div class="right-align">
          <button type="submit">{props.t('add_player')}</button>
        </div>
      </form>

      <h4>{props.t('away_team')}</h4>
      <ul id="away-player-list" class="list" aria-label={props.t('away_team')}>
        {props.players
          .filter((player) => player.teamId === 'away')
          .map((player) => (
            <li key={player.id}>
              <i aria-hidden="true">person</i>
              <div class="max">{player.name}</div>
            </li>
          ))}
      </ul>
      <form
        hx-post={`/edit/${props.sessionId}/players`}
        hx-target="#team-management"
        class="mt-4"
        {...{['hx-on::after-request']: "focusAfterSwap('#team-management')"}}
      >
        <input type="hidden" name="teamId" value="away" />
        <div class={`field label border fill${awayInvalid ? ' invalid' : ''}`}>
          {awayInvalid ? (
            <input
              type="text"
              id="playerNameAway"
              name="playerName"
              value={props.playerName}
              aria-invalid="true"
              aria-describedby="playerNameAway-error"
            />
          ) : (
            <input type="text" id="playerNameAway" name="playerName" required />
          )}
          <label for="playerNameAway">{props.t('new_player_name')}</label>
          {awayInvalid ? (
            <span id="playerNameAway-error" class="error" role="alert">{props.error}</span>
          ) : null}
        </div>
        <div class="right-align">
          <button type="submit">{props.t('add_player')}</button>
        </div>
      </form>
    </section>
  );
}

export interface TeamSectionPartialProps extends TeamSectionProps {
  globalError?: string;
}

export function TeamSectionPartial(props: TeamSectionPartialProps): JSX.Element {
  return (
    <>
      <ErrorContainer globalError={props.globalError} isOob={true} />
      <TeamSection {...props} />
      <OwnTeamVotes
        organizerPlayers={props.organizerPlayers}
        ownTeamResults={props.ownTeamResults}
        t={props.t}
        oob={true}
      />
    </>
  );
}

export interface TeamSectionExtras {
  playerName?: string;
  teamId?: Team;
  error?: string;
  globalError?: string;
}

export function renderTeamSection(
  app: App,
  session: Postponement,
  extra: TeamSectionExtras = {},
): string {
  const view = app.view;
  const {organizerPlayers, ownTeamResults} = buildOwnTeamView(session, app.locale);
  return app.render(
    <TeamSectionPartial
      sessionId={session.id}
      players={session.players}
      organizerPlayers={organizerPlayers}
      ownTeamResults={ownTeamResults}
      t={view.t}
      playerName={extra.playerName}
      teamId={extra.teamId}
      error={extra.error}
      globalError={extra.globalError}
    />,
  );
}
