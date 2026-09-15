import type { JSX } from 'hono/jsx/jsx-runtime';
import type { App, ViewContext } from '../../../app';
import { transientScrapeErrorKey } from '../../../lib/scrape-errors';
import { pageLayout } from '../../layouts/main';

export interface ScrapeStepErrorProps extends ViewContext {
  message: string;
  retryHref: string;
  backHref: string;
}

/**
 * Replaces a scrape wizard step when its scrape failed transiently: the wizard
 * heading, an inline alert with the reason, and a retry plus a back control.
 * Rendered instead of the generic error page so the user can retry in place.
 */
export function ScrapeStepError(props: ScrapeStepErrorProps): JSX.Element {
  const content = (
    <section id="create-section" class="padding small-round surface-variant">
      <header>
        <h2>{props.t('scrape_start_wizard')}</h2>
      </header>

      <div class="error padding white-text" role="alert">
        <div class="max">
          <p>{props.message}</p>
        </div>
      </div>

      <div class="row items-center">
        <a class="button" href={props.retryHref}>
          {props.t('scrape_retry')}
        </a>
        <a href={props.backHref}>
          {props.t('scrape_back')}
        </a>
      </div>
    </section>
  );

  return pageLayout(props, content, props.t('scrape_start_wizard'));
}

/**
 * Renders `ScrapeStepError` for a transient scrape failure, using the current
 * URL as the retry target. Rethrows anything non-transient so it keeps flowing
 * to the generic error path.
 */
export function renderScrapeStepError(app: App, err: unknown, backHref: string): Response {
  const messageKey = transientScrapeErrorKey(err);
  if (messageKey === undefined) {
    throw err;
  }
  const html = app.render(
    <ScrapeStepError
      {...app.view}
      message={app.t(messageKey)}
      retryHref={app.currentUrl()}
      backHref={backHref}
    />,
  );
  return app.html(html, {status: 400});
}
