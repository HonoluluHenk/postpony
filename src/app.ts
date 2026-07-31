import { Eta } from 'eta';
import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import path from 'node:path';
import config from './config';
import { AppError, InternalError, StateError } from './lib/errors';
import { MemorySessionStore, type SessionStore } from './lib/session-store';
import { Timestamp } from './lib/timestamp';
import { defaultLocale, getTranslation, type Locale, LOCALE_KEY, type TranslationKeys } from './locales';

export const eta = new Eta({views: path.join(process.cwd(), 'src/routes')});

export class App {
  readonly timestamp = new Timestamp();

  readonly locale: Locale;

  readonly store: SessionStore;

  private constructor(
    readonly isPartial: boolean,
    readonly c: Context,
    store: SessionStore,
  )
  {
    this.store = store;
    this.locale = (c.get(LOCALE_KEY) as Locale | undefined) ?? defaultLocale;
  }

  static create(c: Context, store?: SessionStore): App {
    const partial = !!c.req.header('HX-Request');
    return new App(partial, c, store ?? new MemorySessionStore());
  }

  t(key: TranslationKeys, params: Record<string, string> = {}): string {
    return getTranslation(this.locale, key, params);
  }

  render(template: string, data: object): string {
    const url = new URL(this.c.req.url);
    const baseUrl = config.get('base-url') || `${url.protocol}//${url.host}`;

    return eta.render(template, {
      ...data,
      t: (key: TranslationKeys, params: Record<string, string>) => this.t(key, params),
      locale: this.locale,
      isPartial: this.isPartial,
      baseUrl,
    });
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
