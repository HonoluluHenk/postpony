import { describe, expect, it, vi } from 'vitest';
import { LOCALE_KEY } from '../../locales';
import { languageMiddleware, localeFromAcceptLanguageHeader, resolveLocale } from './language';

describe('resolveLocale', () => {
  it('gives the explicit ?lang query parameter top priority', () => {
    expect(resolveLocale('de-CH', 'en-US', 'en-US,en;q=0.9'))
      .toBe('de-CH');
  });

  it('uses the persisted cookie next', () => {
    expect(resolveLocale(undefined, 'it-CH', 'en-US,en;q=0.9'))
      .toBe('it-CH');
  });

  it('ignores an invalid query or cookie value', () => {
    expect(resolveLocale('ch', 'xx', 'fr-FR,fr;q=0.9'))
      .toBe('fr-CH');
  });

  it('falls back to the default when nothing is known', () => {
    expect(resolveLocale(undefined, undefined, undefined))
      .toBe('de-CH');
    expect(resolveLocale(undefined, undefined, 'es-ES'))
      .toBe('de-CH');
  });

  it('maps an Accept-Language prefix to its AppLocale', () => {
    expect(resolveLocale(undefined, undefined, 'de-DE'))
      .toBe('de-CH');
    expect(resolveLocale(undefined, undefined, 'fr-CH'))
      .toBe('fr-CH');
    expect(resolveLocale(undefined, undefined, 'it-IT'))
      .toBe('it-CH');
    expect(resolveLocale(undefined, undefined, 'en-US'))
      .toBe('en-US');
  });

  it('maps a bare language subtag too', () => {
    expect(resolveLocale(undefined, undefined, 'en'))
      .toBe('en-US');
  });

  it('prefers the highest q-value entry', () => {
    expect(localeFromAcceptLanguageHeader('de-DE,de;q=0.9,en;q=0.8'))
      .toBe('de-CH');
    expect(localeFromAcceptLanguageHeader('de-DE;q=0.5,en-US;q=0.8'))
      .toBe('en-US');
  });

  it('ignores wildcard-only headers', () => {
    expect(localeFromAcceptLanguageHeader('*'))
      .toBe('de-CH');
  });
});

describe('languageMiddleware', () => {
  function createContext(options: {
    query?: Record<string, string>;
    url?: string;
    cookie?: string;
    acceptLanguage?: string;
  } = {}): {
    context: Record<string, unknown>;
    set: ReturnType<typeof vi.fn>;
    redirect: ReturnType<typeof vi.fn>;
    resHeaders: Record<string, string>;
  }
  {
    const reqHeaders: Record<string, string> = {};
    if (options.cookie !== undefined) {
      reqHeaders['Cookie'] = options.cookie;
    }
    if (options.acceptLanguage !== undefined) {
      reqHeaders['Accept-Language'] = options.acceptLanguage;
    }
    const resHeaders: Record<string, string> = {};
    const set = vi.fn();
    const redirect = vi.fn((url: string) => new Response(null, {status: 302, headers: {Location: url}}));
    return {
      context: {
        req: {
          raw: {headers: new Headers(reqHeaders)},
          query: (name: string): string | undefined => options.query?.[name],
          url: options.url ?? 'https://game-scheduler.localhost:3000/create',
          header: (name: string): string | undefined => reqHeaders[name],
        },
        header: (name: string, value: string): void => {
          resHeaders[name] = value;
        },
        set,
        redirect,
      },
      set,
      redirect,
      resHeaders,
    };
  }

  it('redirects and persists the cookie for an explicit ?lang query', async () => {
    const next = vi.fn();
    const {context, set, redirect, resHeaders} = createContext({
      query: {lang: 'de-CH'},
      url: 'https://game-scheduler.localhost:3000/create?lang=de-CH',
    });

    await languageMiddleware(context as never, next);

    expect(redirect)
      .toHaveBeenCalledWith('https://game-scheduler.localhost:3000/create');
    expect(resHeaders['Set-Cookie'])
      .toContain('lang=de-CH');
    expect(set)
      .not
      .toHaveBeenCalled();
    expect(next)
      .not
      .toHaveBeenCalled();
  });

  it('uses the persisted cookie over the Accept-Language header', async () => {
    const next = vi.fn();
    const {context, set} = createContext({cookie: 'lang=fr-CH', acceptLanguage: 'en-US,en;q=0.9'});

    await languageMiddleware(context as never, next);

    expect(set)
      .toHaveBeenCalledWith(LOCALE_KEY, 'fr-CH');
    expect(next)
      .toHaveBeenCalled();
  });

  it('maps the Accept-Language header when no cookie is set', async () => {
    const next = vi.fn();
    const {context, set} = createContext({acceptLanguage: 'de-DE'});

    await languageMiddleware(context as never, next);

    expect(set)
      .toHaveBeenCalledWith(LOCALE_KEY, 'de-CH');
  });

  it('falls back to the default locale when nothing is known', async () => {
    const next = vi.fn();
    const {context, set} = createContext({});

    await languageMiddleware(context as never, next);

    expect(set)
      .toHaveBeenCalledWith(LOCALE_KEY, 'de-CH');
    expect(next)
      .toHaveBeenCalled();
  });
});
