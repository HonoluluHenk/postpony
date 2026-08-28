import de from './de.json';
import en from './en.json';
import type { AppLocale } from './config';

export type TranslationKeys = keyof typeof en;

// `weekdays_short` is a 7-entry array rather than a string scalar; everything
// else is a plain template string. The union below keeps `TranslationKeys`
// auto-derived from `en.json` while letting arrays live alongside the rest.
// Array-valued keys are not meant to go through `getTranslation`/`app.t()` —
// consumers (e.g. the weekday <select>) read `translations[locale].weekdays_short`
// directly. `getTranslation` defensively stringifies via `String(...)`.
export const translations: Record<AppLocale, Record<TranslationKeys, string | string[]>> = {
  'de-CH': de,
  'en-US': en,
  'fr-CH': en,
  'it-CH': en,
};

export const defaultLocale: AppLocale = 'de-CH';

export const LOCALE_KEY = 'locale';
