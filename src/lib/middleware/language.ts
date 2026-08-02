import type { Context, Next } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import type { AppLocale } from '../../locales';
import { defaultLocale, isLocale, LOCALE_KEY } from '../../locales';
import { factory } from '../hono-factory';

/**
 * Resolves the locale for a request. Precedence:
 * 1. an explicit `?lang=` query parameter (also persisted as a cookie),
 * 2. the persisted `lang` cookie,
 * 3. the `Accept-Language` header mapped by primary-subtag prefix
 *    (`de*` → de-CH, `fr*` → fr-CH, `it*` → it-CH, `en*` → en-US),
 * 4. the default locale.
 */
export function resolveLocale(
  queryLang: string | undefined,
  cookieLang: string | undefined,
  acceptLanguage: string | undefined,
): AppLocale {
  if (isLocale(queryLang)) {
    return queryLang;
  }
  if (isLocale(cookieLang)) {
    return cookieLang;
  }
  return localeFromAcceptLanguageHeader(acceptLanguage);
}

/**
 * Picks the highest-priority `Accept-Language` entry (by q-value) and maps its
 * primary subtag to an AppLocale. Unrecognised and wildcard-only headers fall
 * back to the default locale.
 */
export function localeFromAcceptLanguageHeader(acceptLanguage: string | undefined): AppLocale {
  if (!acceptLanguage) {
    return defaultLocale;
  }
  const tag = acceptLanguage.split(',')
    .map((part) => {
      const [rawTag = '', ...rawParams] = part.trim()
        .split(';');
      const qMatch = /q=([\d.]+)/.exec(rawParams.join(';'));
      return {
        tag: rawTag.trim()
          .toLowerCase(), q: qMatch ? Number(qMatch[1]) : 1,
      };
    })
    .filter(({tag}) => tag.length > 0)
    .sort((a, b) => b.q - a.q)[0]?.tag;
  if (tag?.startsWith('de')) {
    return 'de-CH';
  }
  if (tag?.startsWith('fr')) {
    return 'fr-CH';
  }
  if (tag?.startsWith('it')) {
    return 'it-CH';
  }
  if (tag?.startsWith('en')) {
    return 'en-US';
  }
  return defaultLocale;
}

export const languageMiddleware = factory.createMiddleware(async (c: Context, next: Next) => {
  const queryLocale = c.req.query('lang');

  if (isLocale(queryLocale)) {
    setCookie(c, 'lang', queryLocale, {maxAge: 365 * 24 * 60 * 60, path: '/'});

    const url = new URL(c.req.url);
    url.searchParams.delete('lang');
    return c.redirect(url.toString());
  }

  const locale = resolveLocale(undefined, getCookie(c, 'lang'), c.req.header('Accept-Language'));
  c.set(LOCALE_KEY, locale);

  return next();
});
