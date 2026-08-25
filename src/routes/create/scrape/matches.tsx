import type { JSX } from 'hono/jsx/jsx-runtime';
import type { ViewContext } from '../../../app';
import type { Match, PlayerOnTeam } from '../../../lib/click-tt-scraper';
import { pageLayout } from '../../layouts/main';
import type { WizardChangeMode } from '../change-utils';

export interface ScrapeMatchRow extends Match {
  opponentTeamtable: string;
}

export interface ScrapeMatchesPageProps extends ViewContext, WizardChangeMode {
  title?: string;
  matches: readonly ScrapeMatchRow[];
  players: readonly PlayerOnTeam[];
  leagueName: string;
  groupName: string;
  teamName: string;
  championship: string;
  group: string;
}

export function ScrapeMatchesPage(props: ScrapeMatchesPageProps): JSX.Element {
  const content = (
    <section id="create-section" class="padding small-round surface-variant">
      <header>
        <h2>{props.t('scrape_choose_match')}</h2>
        <p>
          <strong>{props.teamName}</strong>
          {' — '}
          {props.groupName}
          {' — '}
          {props.leagueName}
        </p>
      </header>

      {props.matches.length === 0 ? (
        <p>{props.t('scrape_no_matches')}</p>
      ) : (
        <table class="border">
          <caption>{props.t('scrape_choose_match')}</caption>
          <thead>
            <tr>
              <th scope="col">{props.t('scrape_match_date')}</th>
              <th scope="col">{props.t('scrape_match_time')}</th>
              <th scope="col">{props.t('scrape_match_home')}</th>
              <th scope="col">{props.t('scrape_match_guest')}</th>
              <th scope="col"><span class="visually-hidden">{props.t('scrape_match_actions')}</span></th>
            </tr>
          </thead>
          <tbody>
            {props.matches.map((m) => (
              <tr>
                <td data-label={props.t('scrape_match_date')}>{m.day} {m.date}</td>
                <td data-label={props.t('scrape_match_time')}>{m.time}</td>
                <td data-label={props.t('scrape_match_home')}>{m.homeTeam}</td>
                <td data-label={props.t('scrape_match_guest')}>{m.guestTeam}</td>
                <td data-label={props.t('scrape_match_actions')}>
                  <form method="post" action="/create/scrape/match">
                    {props.changeMode ? (
                      <>
                        <input type="hidden" name="sessionId" value={props.sessionId} />
                        <input type="hidden" name="ownerPassword" value={props.ownerPassword} />
                      </>
                    ) : null}
                    <input type="hidden" name="day" value={m.day} />
                    <input type="hidden" name="date" value={m.date} />
                    <input type="hidden" name="time" value={m.time} />
                    <input type="hidden" name="homeTeam" value={m.homeTeam} />
                    <input type="hidden" name="guestTeam" value={m.guestTeam} />
                    <input type="hidden" name="groupName" value={props.groupName} />
                    <input type="hidden" name="leagueName" value={props.leagueName} />
                    <input type="hidden" name="championship" value={props.championship} />
                    <input type="hidden" name="group" value={props.group} />
                    <input type="hidden" name="teamName" value={props.teamName} />
                    <input type="hidden" name="opponentTeamtable" value={m.opponentTeamtable} />
                    {props.players.map((player) => (
                      <input type="hidden" name="playerName" value={player.name} />
                    ))}
                    <button type="submit" class="small">
                      {props.t('scrape_select')}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div class="right-align">
        {props.changeMode ? (
          <a href={`/edit/${props.sessionId}?ownerPassword=${props.ownerPassword}`}>
            {props.t('scrape_back')}
          </a>
        ) : (
          <a href={`/create/scrape/teams?championship=${encodeURIComponent(props.championship)}&group=${encodeURIComponent(props.group)}&groupName=${encodeURIComponent(props.groupName)}&leagueName=${encodeURIComponent(props.leagueName)}`}>
            {props.t('scrape_back')}
          </a>
        )}
      </div>
    </section>
  );

  return pageLayout(props, content, props.title ?? props.t('scrape_choose_match'));
}
