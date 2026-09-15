import type { JSX } from 'hono/jsx/jsx-runtime';
import type { ViewContext } from '../../app';
import type { Player, Postponement } from '../../lib/models';
import type { TranslateFn } from '../../locales';
import { pageLayout } from '../layouts/main';
import { StatusAnnouncement } from '../partials/status-announcement';
import { StatusChip } from '../edit/id/status-chip';
import { withOpponentPassword } from './opponent-utils';

export interface OpponentDateItem {
  id: string;
  display: string;
  vetoed: boolean;
  acceptable: boolean;
  yes: number;
  no: number;
  ifNecessary: number;
}

export interface OpponentViewData {
  opponentTeamName: string;
  players: Player[];
  dates: OpponentDateItem[];
}

export interface OpponentPageProps extends ViewContext, OpponentViewData {
  title?: string;
  session: Postponement;
  opponentCaptainPassword?: string;
  playerName?: string;
  playerError?: string;
  statusMessage?: string;
  globalError?: string;
}

function DateActions(props: {
  session: Postponement;
  date: OpponentDateItem;
  t: TranslateFn;
  opponentCaptainPassword?: string;
}): JSX.Element {
  const {session, date, t, opponentCaptainPassword} = props;
  return (
    <div class="date-actions">
      <label class="action action--votable action--veto" title={t('opponent_veto_toggle')}>
        <input
          type="checkbox"
          hx-post={withOpponentPassword(`/opponent/${session.id}/veto?proposedDateId=${date.id}&vetoed=${!date.vetoed}`, opponentCaptainPassword)}
          hx-target="#opponent-view"
          checked={date.vetoed}
          aria-label={t('opponent_veto_toggle')}
        />
        {t('opponent_veto')}: {date.vetoed ? t('votable_on') : t('votable_off')}
      </label>
      <label class="action action--votable action--acceptable" title={t('opponent_acceptable_toggle')}>
        <input
          type="checkbox"
          hx-post={withOpponentPassword(`/opponent/${session.id}/acceptable?proposedDateId=${date.id}&acceptable=${!date.acceptable}`, opponentCaptainPassword)}
          hx-target="#opponent-view"
          checked={date.acceptable}
          aria-label={t('opponent_acceptable_toggle')}
        />
        {t('opponent_acceptable')}: {date.acceptable ? t('votable_on') : t('votable_off')}
      </label>
    </div>
  );
}

export function OpponentPage(props: OpponentPageProps): JSX.Element {
  const title = props.title ?? props.t('opponent_title');

  const headingTitle = (
    <span class="redesign-headline">
      <span>{props.opponentTeamName}</span>
    </span>
  );

  const content = (
    <div id="opponent-view" class="opponent-view">
      <StatusAnnouncement message={props.statusMessage} isOob={props.isPartial}/>

      <div class="side-block">
        <StatusChip status={props.session.status} t={props.t}/>
      </div>

      <section id="opponent-roster">
        <h2>{props.t('opponent_roster_heading')}</h2>
        <ul class="list" aria-label={props.t('opponent_roster_heading')}>
          {props.players.map((player) => (
            <li key={player.id}>
              <i aria-hidden="true">person</i>
              <div class="max">{player.name}</div>
              <form
                hx-post={withOpponentPassword(`/opponent/${props.session.id}/players`, props.opponentCaptainPassword)}
                hx-target="#opponent-view"
              >
                <input type="hidden" name="playerId" value={player.id}/>
                <button
                  type="submit"
                  class="button small"
                  aria-label={props.t('remove_player_aria_label', {name: player.name})}
                >
                  {props.t('remove_player')}
                </button>
              </form>
            </li>
          ))}
        </ul>
        <form
          hx-post={withOpponentPassword(`/opponent/${props.session.id}/players`, props.opponentCaptainPassword)}
          hx-target="#opponent-view"
          class="mt-4"
        >
          <div class={`field label border fill${props.playerError ? ' invalid' : ''}`}>
            {props.playerError ? (
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
              <input type="text" id="playerName" name="playerName" required autocomplete="off"/>
            )}
            <label for="playerName">{props.t('new_player_name')}</label>
            {props.playerError ? <span id="playerName-error" class="error" role="alert">{props.playerError}</span> : null}
          </div>
          <div class="right-align">
            <button type="submit">{props.t('add_player')}</button>
          </div>
        </form>
      </section>

      <section id="opponent-dates">
        <h2>{props.t('proposed_dates_management')}</h2>
        {props.dates.length === 0 ? (
          <p class="muted mt-2">{props.t('proposed_dates_none')}</p>
        ) : (
          props.dates.map((date) => (
            <article key={date.id} class="date-row">
              <div class="date-cell">
                <span class="date-num">{date.display}</span>
              </div>
              <div class="date-main">
                <span class="team-tally">
                  {props.opponentTeamName}: {date.yes + date.ifNecessary} ({date.yes}/{date.ifNecessary}/{date.no})
                </span>
                <DateActions
                  session={props.session}
                  date={date}
                  t={props.t}
                  opponentCaptainPassword={props.opponentCaptainPassword}
                />
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );

  return pageLayout(props, content, title, props.globalError, headingTitle);
}
