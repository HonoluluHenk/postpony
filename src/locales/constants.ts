import de from './de.json';
import en from './en.json';
import type { AppLocale } from './config';

export type TranslationKeys = keyof typeof en;

// de-CH reuses the German UI text, en-US the English; fr-CH and it-CH fall
// back to the English text until dedicated translations land (ADR-0016).
export const translations: Record<AppLocale, Record<TranslationKeys, string>> = {
  'de-CH': de,
  'en-US': en,
  'fr-CH': en,
  'it-CH': en,
};

export const defaultLocale: AppLocale = 'de-CH';

export const LOCALE_KEY = 'locale';
