import { AppLocales, type AppLocale } from './config';
import { defaultLocale, translations, type TranslationKeys } from './constants';

export type TranslateFn = (key: TranslationKeys, params?: Record<string, string>) => string;

export function isLocale(value: unknown): value is AppLocale {
  return typeof value === 'string'
    && (AppLocales as readonly string[]).includes(value);
}

export function getTranslation(locale: AppLocale, key: TranslationKeys, params: Record<string, string> = {}): string {
  // Some keys (`weekdays_short`) are arrays on the underlying record; coerce
  // safely so `String(["a","b"]) -> "a,b"` for callers that pass through `t()`.
  let template = String(translations[locale][key] || translations[defaultLocale][key] || key);
  for (const [param, value] of Object.entries(params)) {
    template = template.replace(new RegExp(`<%=\\s*it\\.${param}\\s*%>`, 'g'), value);
  }
  return template;
}
