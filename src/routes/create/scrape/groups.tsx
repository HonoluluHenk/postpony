import type { JSX } from 'hono/jsx/jsx-runtime';
import type { ViewContext } from '../../../app';
import type { Group } from '../../../lib/click-tt-scraper';
import { pageLayout } from '../../layouts/main';
import type { WizardChangeMode } from '../change-utils';

export interface ScrapeGroupsPageProps extends ViewContext, WizardChangeMode {
  title?: string;
  groups: readonly Group[];
  leagueName: string;
}

export function ScrapeGroupsPage(props: ScrapeGroupsPageProps): JSX.Element {
  const content = (
    <section id="create-section" class="padding small-round surface-variant">
      <header>
        <h2>{props.t('scrape_choose_group')}</h2>
        <p><strong>{props.leagueName}</strong></p>
      </header>

      {props.groups.length === 0 ? (
        <p>{props.t('scrape_no_groups')}</p>
      ) : (
        <ul class="list border">
          {props.groups.map((group) => (
            <li>
              <a
                href={`/create/scrape/teams?championship=${encodeURIComponent(group.championship)}&group=${encodeURIComponent(group.group)}&groupName=${encodeURIComponent(group.name)}&leagueName=${encodeURIComponent(props.leagueName)}${props.changeSuffix}`}
              >
                {group.name}
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
          <a href="/create/scrape">
            {props.t('scrape_back')}
          </a>
        )}
      </div>
    </section>
  );

  return pageLayout(props, content, props.title ?? props.t('scrape_choose_group'));
}
