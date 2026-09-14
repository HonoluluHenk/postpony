import { AppLocales, type AppLocale } from './config';
import { translations, type TranslationKeys } from './constants';

export type TranslateFn = (key: TranslationKeys, params?: Record<string, string>) => string;

export function isLocale(value: unknown): value is AppLocale {
  return typeof value === 'string'
    && (AppLocales as readonly string[]).includes(value);
}

export function getTranslation(locale: AppLocale, key: TranslationKeys, params: Record<string, string> = {}): string {
  // ponytail: every locale record is kept key-synchronized with en.json (see
  // translations.spec.ts), so the index always resolves; the dead fallback
  // chain was removed. If a locale ever lags, that spec fails loudly.
  let template = translations[locale][key];
  for (const [param, value] of Object.entries(params)) {
    template = template.replace(new RegExp(`<%=\\s*it\\.${param}\\s*%>`, 'g'), value);
  }
  return template;
}
