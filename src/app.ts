import { Eta } from 'eta';
import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import path from 'node:path';
import config from './config';
import { AppError, InternalError, StateError } from './lib/errors';
import type { RescheduleSession } from './lib/models';
import { defaultLocale, getTranslation, LOCALE_KEY, type Locale, type TranslationKeys } from './locales';

export const eta = new Eta({views: path.join(process.cwd(), 'src/routes')});

export class App {
  readonly locale: Locale;

  private constructor(
    readonly isPartial: boolean,
    readonly c: Context,
  )
  {
    this.locale = (c.get(LOCALE_KEY) as Locale | undefined) ?? defaultLocale;
  }

  static create(c: Context): App {
    const partial = !!c.req.header('HX-Request');
    return new App(partial, c);
  }

  t(key: TranslationKeys, params: Record<string, string> = {}): string {
    return getTranslation(this.locale, key, params);
  }

  private static readonly sessions: Record<string, RescheduleSession> = {};

  readonly sessions: Record<string, RescheduleSession> = App.sessions;

  render(template: string, data: object): string {
    const url = new URL(this.c.req.url);
    const baseUrl = config.get('baseUrl') || `${url.protocol}//${url.host}`;

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
