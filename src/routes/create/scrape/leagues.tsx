import type { JSX } from 'hono/jsx/jsx-runtime';
import type { ViewContext } from '../../../app';
import type { League } from '../../../lib/click-tt-scraper';
import { pageLayout } from '../../layouts/main';

export interface ScrapeLeaguesPageProps extends ViewContext {
  title?: string;
  leagues: readonly League[];
}

export function ScrapeLeaguesPage(props: ScrapeLeaguesPageProps): JSX.Element {
  const content = (
    <section id="create-section" class="padding small-round surface-variant">
      <header>
        <h2>{props.t('scrape_choose_league')}</h2>
      </header>

      {props.leagues.length === 0 ? (
        <p>{props.t('scrape_no_leagues')}</p>
      ) : (
        <ul class="list border">
          {props.leagues.map((league) => (
            <li>
              <a
                href={`/create/scrape/groups?championship=${encodeURIComponent(league.championship)}&leagueName=${encodeURIComponent(league.name)}`}
              >
                {league.name}
              </a>
            </li>
          ))}
        </ul>
      )}

      <div class="right-align">
        <a href="/create/scrape">
          {props.t('scrape_back')}
        </a>
      </div>
    </section>
  );

  return pageLayout(props, content, props.title ?? props.t('scrape_start_wizard'));
}
