import type { Context, Next } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import { defaultLocale, isLocale, type Locale, LOCALE_KEY } from '../../locales';
import { factory } from '../hono-factory';

export const languageMiddleware = factory.createMiddleware(async (c: Context, next: Next) => {
  const queryLocale = c.req.query('lang');

  if (isLocale(queryLocale)) {
    setCookie(c, 'lang', queryLocale, {maxAge: 365 * 24 * 60 * 60, path: '/'});

    const url = new URL(c.req.url);
    url.searchParams.delete('lang');
    return c.redirect(url.toString());
  }

  const cookieLocale = getCookie(c, 'lang') as Locale | undefined;
  if (isLocale(cookieLocale)) {
    c.set(LOCALE_KEY, cookieLocale);
    return next();
  }

  const acceptLanguage = c.req.header('Accept-Language');
  if (acceptLanguage?.startsWith('de')) {
    c.set('locale', 'de');
  } else {
    c.set(LOCALE_KEY, defaultLocale);
  }

  await next();
});
