import de from './de.json';
import en from './en.json';

export const Locales = ['en', 'de'] as const;

export type Locale = typeof Locales[number];
export type TranslationKeys = keyof typeof en;

export const translations: Record<Locale, Record<TranslationKeys, string>> = {
  en,
  de,
};

export const defaultLocale: Locale = 'en';
