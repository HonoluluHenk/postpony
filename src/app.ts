import type { Context } from 'hono';
import type { JSX } from 'hono/jsx/jsx-runtime';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import config from './config';
import { AppError, InternalError, StateError } from './lib/errors';
import { MemorySessionStore, type SessionStore } from './lib/session-store';
import { Timestamp } from './lib/timestamp';
import {
  type AppLocale,
  defaultLocale,
  getTranslation,
  inputFormat,
  type LanguageOption,
  languageOptions,
  LOCALE_KEY,
  type TranslateFn,
  type TranslationKeys,
} from './locales';

export interface ViewContext {
  t: TranslateFn;
  locale: AppLocale;
  isPartial: boolean;
  baseUrl: string;
  inputFormat: string;
  languageOptions: readonly LanguageOption[];
}

export class App {
  readonly timestamp = new Timestamp();

  readonly locale: AppLocale;

  readonly store: SessionStore;

  private constructor(
    readonly isPartial: boolean,
    private readonly c: Context,
    store: SessionStore,
  )
  {
    this.store = store;
    this.locale = (c.get(LOCALE_KEY) as AppLocale | undefined) ?? defaultLocale;
  }

  static create(c: Context, store?: SessionStore): App {
    const partial = !!c.req.header('HX-Request');
    return new App(partial, c, store ?? new MemorySessionStore());
  }

  query(name: string): string | undefined {
    return this.c.req.query(name);
  }

  body(): Promise<Record<string, string | File>>;
  body(options: {all: true}): Promise<Record<string, string | File | (string | File)[]>>;
  body(options?: {all?: boolean}): Promise<Record<string, string | File | (string | File)[]>> {
    return this.c.req.parseBody(options);
  }

  header(name: string): string | undefined {
    return this.c.req.header(name);
  }

  /**
   * The URL the browser is on: HTMX forwards it as HX-Current-URL on partial
   * requests, otherwise it is the request URL itself. The edit rail reads its
   * sort from here so a mutation (posted without the query) keeps the order.
   */
  currentUrl(): string {
    return this.c.req.header('HX-Current-URL') ?? this.c.req.url;
  }

  html(content: string, init?: {status?: ContentfulStatusCode}): Response {
    return this.c.html(content, init);
  }

  redirect(location: string): Response {
    return this.c.redirect(location);
  }

  text(content: string, status?: ContentfulStatusCode): Response {
    return this.c.text(content, status);
  }

  setHeader(name: string, value: string): void {
    this.c.header(name, value);
  }

  get view(): ViewContext {
    const url = new URL(this.c.req.url);
    const baseUrl = config.get('base-url') || `${url.protocol}//${url.host}`;

    return {
      t: (key: TranslationKeys, params?: Record<string, string>): string => this.t(key, params),
      locale: this.locale,
      isPartial: this.isPartial,
      baseUrl,
      languageOptions: languageOptions(),
      inputFormat: inputFormat(this.locale),
    };
  }

  t(key: TranslationKeys, params: Record<string, string> = {}): string {
    return getTranslation(this.locale, key, params);
  }

  render(component: JSX.Element): string {
    return (component as unknown as { toString(): string }).toString();
  }

  requireParam(name: string): string;
  requireParam<P>(name: string, transform: (value: string) => P): P;
  requireParam<P>(name: string, transform?: (value: string) => P): P {
    const value = this.c.req.param(name);
    if (value === undefined) {
      this.failure(this.t('missing_param', {name}));
    }

    if (!transform) {
      return value as P;
    }

    return transform(value);
  }


  notFound(message: string = this.t('not_found')): never {
    throw new StateError(message, 404);
  }

  internal(message: string = this.t('internal_server_error')): never {
    throw new InternalError(message);
  }

  failure(message: string, status: ContentfulStatusCode = 400): never {
    throw new AppError(message, status);
  }
}
