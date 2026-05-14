import { Eta } from 'eta';
import type { Context } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import path from 'node:path';
import { AppError, InternalError, StateError } from './lib/errors';
import type { RescheduleSession } from './lib/models';
import { defaultLocale, getTranslation, type Locale, type TranslationKeys } from './locales';

export const eta = new Eta({views: path.join(process.cwd(), 'src/views')});

export class App {
  readonly locale: Locale;

  constructor(
    readonly isPartial: boolean,
    readonly c: Context,
  )
  {
    this.locale = this.detectLocale();
  }

  private detectLocale(): Locale {
    const queryLocale = this.c.req.query('lang') as Locale | undefined;
    if (queryLocale && (queryLocale === 'en' || queryLocale === 'de')) {
      // Persist the choice from URL parameter
      setCookie(this.c, 'lang', queryLocale, {maxAge: 365 * 24 * 60 * 60, path: '/'});
      return queryLocale;
    }

    const cookieLocale = getCookie(this.c, 'lang') as Locale | undefined;
    if (cookieLocale && (cookieLocale === 'en' || cookieLocale === 'de')) {
      return cookieLocale;
    }

    const acceptLanguage = this.c.req.header('Accept-Language');
    if (!acceptLanguage) {
      return defaultLocale;
    }

    if (acceptLanguage.startsWith('de')) {
      return 'de';
    }
    return defaultLocale;
  }

  t(key: TranslationKeys, params: Record<string, string> = {}): string {
    return getTranslation(this.locale, key, params);
  }

  private static readonly sessions: Record<string, RescheduleSession> = {};

  readonly sessions: Record<string, RescheduleSession> = App.sessions;

  render(template: string, data: object): string {
    return eta.render(template, {
      ...data,
      t: (key: TranslationKeys, params: Record<string, string>) => this.t(key, params),
      locale: this.locale,
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
