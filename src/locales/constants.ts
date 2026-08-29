import de from './de.json';
import en from './en.json';
import type { AppLocale } from './config';

export type TranslationKeys = keyof typeof en;

export const translations: Record<AppLocale, Record<TranslationKeys, string>> = {
  'de-CH': de,
  'en-US': en,
  // fr-CH / it-CH inherit English text per ADR-0016 until dedicated translations land.
  'fr-CH': en,
  'it-CH': en,
};

export const defaultLocale: AppLocale = 'de-CH';

export const LOCALE_KEY = 'locale';
