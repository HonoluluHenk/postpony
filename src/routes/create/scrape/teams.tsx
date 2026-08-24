import type { JSX } from 'hono/jsx/jsx-runtime';
import type { ViewContext } from '../../../app';
import type { Team } from '../../../lib/click-tt-scraper';
import { pageLayout } from '../../layouts/main';
import type { WizardChangeMode } from '../change-utils';

export interface ScrapeTeamsPageProps extends ViewContext, WizardChangeMode {
  title?: string;
  teams: readonly Team[];
  leagueName: string;
  groupName: string;
  championship: string;
}

export function ScrapeTeamsPage(props: ScrapeTeamsPageProps): JSX.Element {
  const content = (
    <section id="create-section" class="padding small-round surface-variant">
      <header>
        <h2>{props.t('scrape_choose_team')}</h2>
        <p>
          <strong>{props.groupName}</strong>
          {' — '}
          {props.leagueName}
        </p>
      </header>

      {props.teams.length === 0 ? (
        <p>{props.t('scrape_no_teams')}</p>
      ) : (
        <ul class="list border">
          {props.teams.map((team) => (
            <li>
              <a
                href={`/create/scrape/matches?championship=${encodeURIComponent(team.championship)}&group=${encodeURIComponent(team.group)}&teamtable=${encodeURIComponent(team.teamtable)}&teamName=${encodeURIComponent(team.name)}&groupName=${encodeURIComponent(props.groupName)}&leagueName=${encodeURIComponent(props.leagueName)}${props.changeSuffix}`}
              >
                {team.name}
              </a>
            </li>
          ))}
        </ul>
      )}

      <div class="right-align">
        {props.changeMode ? (
          <a href={`/edit/${props.sessionId}?ownerPassword=${props.ownerPassword}`}>
            {props.t('scrape_back')}
          </a>
        ) : (
          <a href={`/create/scrape/groups?championship=${encodeURIComponent(props.championship)}&leagueName=${encodeURIComponent(props.leagueName)}`}>
            {props.t('scrape_back')}
          </a>
        )}
      </div>
    </section>
  );

  return pageLayout(props, content, props.title ?? props.t('scrape_choose_team'));
}
