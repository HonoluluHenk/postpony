import type { Context, Next } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import { createMiddleware } from 'hono/factory';
import { defaultLocale, isLocale, type Locale } from '../../locales';

export const LOCALE_KEY = 'locale';

export const languageMiddleware = createMiddleware<{
  Variables: {
    [LOCALE_KEY]: Locale;
  };
}>(async (c: Context, next: Next) => {
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
    return await next();
  }

  const acceptLanguage = c.req.header('Accept-Language');
  if (acceptLanguage && acceptLanguage.startsWith('de')) {
    c.set(LOCALE_KEY, 'de');
  } else {
    c.set(LOCALE_KEY, defaultLocale);
  }

  await next();
});
