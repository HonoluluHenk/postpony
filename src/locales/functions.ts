import { defaultLocale, Locale, Locales, TranslationKeys, translations } from './constants';

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string'
    && (Locales as readonly string[]).includes(value);
}

export function getTranslation(locale: Locale, key: TranslationKeys, params: Record<string, string> = {}): string {
  let template = translations[locale][key] || translations[defaultLocale][key] || key;
  for (const [param, value] of Object.entries(params)) {
    template = template.replace(new RegExp(`<%=\\s*it\\.${param}\\s*%>`, 'g'), value);
  }
  return template;
}

export function toIntlLocale(locale: Locale): 'en-GB' | 'de-DE' {
  return locale === 'de' ? 'de-DE' : 'en-GB';
}
