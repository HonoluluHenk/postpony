import type { Child } from 'hono/jsx';
import type { JSX } from 'hono/jsx/jsx-runtime';
import { raw } from 'hono/utils/html';
import type { ViewContext } from '../../app';
import { ErrorContainer } from '../partials/error-container';

export interface LayoutProps extends ViewContext {
  title: string;
  globalError?: string;
  children?: Child;
}

export function Layout(props: LayoutProps): JSX.Element {
  return (
    <>
      {raw('<!DOCTYPE html>')}
      <html lang={props.locale}>
      <head>
        <meta charset="UTF-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <title>{props.title}</title>
        <link rel="icon" type="image/svg+xml" href="/assets/logos/favicon.svg"/>
        <script src="/assets/vendor/js/htmx.min.js"></script>
        {raw(`<style>
    @import url('/assets/vendor/css/beer.min.css') layer(vendor);
    @import url('/assets/vendor/css/air-datepicker.css') layer(vendor);
    @layer design;
  </style>`)}
        <script type="module" src="/assets/vendor/js/beer.min.js"></script>
        <script type="module" src="/assets/vendor/js/material-dynamic-colors.min.js"></script>
        <script src="/assets/vendor/js/air-datepicker.min.js"></script>
        <script src="/assets/vendor/js/air-datepicker-locales.js"></script>
        <script type="module" src="/assets/js/main.js"></script>
        <link rel="stylesheet" href="/assets/css/design-tokens.css"/>
        <link rel="stylesheet" href="/assets/css/style.css"/>
      </head>
      <body class="light">
      <a href="#main-content" class="skip-link">{props.t('skip_to_main')}</a>
      <div class="container" hx-boost="true" hx-target="#main-content">
        <header class="padding">
          <div class="row no-wrap">
            <a href="/" class="shrink" aria-label="PostPony home">
              <img src="/assets/logos/wordmark.svg" alt="PostPony" height="40"/>
            </a>
            <h1 class="max center-align">{props.title}</h1>
            <nav class="row no-wrap shrink" aria-label={props.t('language_selection')}>
              <form class="no-margin">
                <label class="visually-hidden" for="language-select">{props.t('language_selection')}</label>
                <select id="language-select" aria-label={props.t('language_selection')}
                        onchange="const p=new URLSearchParams(window.location.search);p.set('lang',this.value);window.location.search=p.toString()">
                  {props.languageOptions.map((option) => (
                    <option value={option.code} selected={props.locale === option.code}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </form>
            </nav>
          </div>
        </header>
        <ErrorContainer globalError={props.globalError}/>
        <main id="main-content" class="responsive">
          <article>
            {props.children}
          </article>
        </main>
        <footer class="padding center-align">
          <p>&copy; 2024 PostPony</p>
        </footer>
      </div>
      <div id="global-spinner" class="global-spinner" role="status" aria-live="polite" aria-hidden="true">
        <div class="global-spinner__circle" aria-hidden="true"></div>
        <span class="global-spinner__label">{props.t('loading')}</span>
      </div>
      </body>
      </html>
    </>
  );
}

export interface PartialLayoutProps {
  children?: Child;
  globalError?: string;
}

export function PartialLayout(props: PartialLayoutProps): JSX.Element {
  return (
    <>
      <ErrorContainer globalError={props.globalError} isOob={true}/>
      <main id="main-content" class="responsive">
        <article>
          {props.children}
        </article>
      </main>
    </>
  );
}

export function pageLayout(
  view: ViewContext,
  content: Child,
  title?: string,
  globalError?: string,
): JSX.Element {
  if (view.isPartial) {
    return <PartialLayout globalError={globalError}>{content}</PartialLayout>;
  }

  return (
    <Layout {...view} title={title ?? view.t('app_title')} globalError={globalError}>
      {content}
    </Layout>
  );
}
