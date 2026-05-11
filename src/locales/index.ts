import de from './de.json';
import en from './en.json';

export type Locale = 'en' | 'de';
export type TranslationKeys = keyof typeof en;

export const translations: Record<Locale, Record<TranslationKeys, string>> = {
  en,
  de,
};

export const defaultLocale: Locale = 'en';

export function getTranslation(locale: Locale, key: TranslationKeys, params: Record<string, string> = {}): string {
  let template = translations[locale][key] || translations[defaultLocale][key] || key;
  for (const [param, value] of Object.entries(params)) {
    template = template.replace(new RegExp(`<%=\\s*it\\.${param}\\s*%>`, 'g'), value);
  }
  return template;
}
