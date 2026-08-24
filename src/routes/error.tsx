import type { JSX } from 'hono/jsx/jsx-runtime';
import type { ViewContext } from '../app';
import { pageLayout } from './layouts/main';

export interface ErrorPageProps extends ViewContext {
  title?: string;
  message?: string;
  globalError?: string;
}

export function ErrorContent(props: { t: ViewContext['t'] }): JSX.Element {
  return (
    <section class="padding small-round surface-variant">
      <header>
        <h2>{props.t('error_title')}</h2>
      </header>
      <div class="mt-4">
        <a href="/" class="button">{props.t('return_home')}</a>
      </div>
    </section>
  );
}

export function ErrorPage(props: ErrorPageProps): JSX.Element {
  const title = props.title ?? props.t('error_title');
  const globalError = props.globalError ?? props.message;

  return pageLayout(props, <ErrorContent t={props.t} />, title, globalError);
}
