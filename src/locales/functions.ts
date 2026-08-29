import { AppLocales, type AppLocale } from './config';
import { defaultLocale, translations, type TranslationKeys } from './constants';

export type TranslateFn = (key: TranslationKeys, params?: Record<string, string>) => string;

export function isLocale(value: unknown): value is AppLocale {
  return typeof value === 'string'
    && (AppLocales as readonly string[]).includes(value);
}

export function getTranslation(locale: AppLocale, key: TranslationKeys, params: Record<string, string> = {}): string {
  let template = translations[locale][key] || translations[defaultLocale][key] || key;
  for (const [param, value] of Object.entries(params)) {
    template = template.replace(new RegExp(`<%=\\s*it\\.${param}\\s*%>`, 'g'), value);
  }
  return template;
}
