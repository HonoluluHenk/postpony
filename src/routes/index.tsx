import type { JSX } from 'hono/jsx/jsx-runtime';
import type { ViewContext } from '../app';
import { pageLayout } from './layouts/main';

export interface IndexPageProps extends ViewContext {
  title?: string;
}

export function IndexContent(props: { t: ViewContext['t'] }): JSX.Element {
  return (
    <section class="padding small-round surface-variant">
      <header class="center-align">
        <h2>{props.t('welcome')}</h2>
        <p>{props.t('tagline')}</p>
      </header>

      <nav class="center-align mt-4" aria-label={props.t('main_actions')}>
        <a class="button" href="/create">{props.t('create_new')}</a>
        <a class="button" href="/create/scrape">{props.t('scrape_start_wizard')}</a>
        <a class="button outline" href="/edit">{props.t('edit_existing')}</a>
      </nav>
    </section>
  );
}

export function IndexPage(props: IndexPageProps): JSX.Element {
  return pageLayout(props, <IndexContent t={props.t} />, props.title ?? props.t('app_title'));
}
