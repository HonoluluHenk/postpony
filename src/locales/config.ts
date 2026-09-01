/**
 * Single source of truth for the four supported locales. Every locale's
 * date-input token vocabulary, Intl tag, clock style, and UI label live here;
 * the server parser, the server formatter, the input placeholder, and the
 * picker configuration all read from this module — a format change is one
 * edit, not five.
 */

export const AppLocales = ['de-CH', 'fr-CH', 'it-CH', 'en-US'] as const;

export type AppLocale = typeof AppLocales[number];

export interface LocaleConfig {
  /** BCP-47 tag, identical to the AppLocale code itself. */
  intlTag: AppLocale;
  /** Date part of the input token vocabulary, e.g. `dd.MM.yyyy`. */
  dateFormat: string;
  /** Time part of the input token vocabulary, e.g. `HH:mm` or `hh:mm aa`. */
  timeFormat: string;
  /** True for 24-hour clocks, false for the 12-hour `am`/`pm` clock. */
  clock24: boolean;
  /** True when the date format is day-first (`dd` before `MM`). */
  dayFirst: boolean;
  /** Native name shown in the header language dropdown. */
  label: string;
  /** Flag emoji shown in the header language dropdown, keyed by the language of that locale. */
  flag: string;
}

export const localeConfigs: Record<AppLocale, LocaleConfig> = {
  'de-CH': {
    intlTag: 'de-CH',
    dateFormat: 'dd.MM.yyyy',
    timeFormat: 'HH:mm',
    clock24: true,
    dayFirst: true,
    label: 'Deutsch',
    flag: '🇩🇪',
  },
  'fr-CH': {
    intlTag: 'fr-CH',
    dateFormat: 'dd.MM.yyyy',
    timeFormat: 'HH:mm',
    clock24: true,
    dayFirst: true,
    label: 'Français',
    flag: '🇫🇷',
  },
  'it-CH': {
    intlTag: 'it-CH',
    dateFormat: 'dd.MM.yyyy',
    timeFormat: 'HH:mm',
    clock24: true,
    dayFirst: true,
    label: 'Italiano',
    flag: '🇮🇹',
  },
  'en-US': {
    intlTag: 'en-US',
    dateFormat: 'MM/dd/yyyy',
    timeFormat: 'hh:mm aa',
    clock24: false,
    dayFirst: false,
    label: 'English',
    flag: '🇬🇧',
  },
};

export function localeConfig(locale: AppLocale): LocaleConfig {
  return localeConfigs[locale];
}

/**
 * The combined token string shown as the input placeholder and used as the
 * parse grammar for the locale, e.g. `dd.MM.yyyy HH:mm`.
 */
export function inputFormat(locale: AppLocale): string {
  const {dateFormat, timeFormat} = localeConfigs[locale];
  return `${dateFormat} ${timeFormat}`;
}

export interface LanguageOption {
  code: AppLocale;
  label: string;
  flag: string;
}

/**
 * The options for the header language dropdown.
 */
export function languageOptions(): LanguageOption[] {
  return AppLocales.map((code) => ({code, label: localeConfigs[code].label, flag: localeConfigs[code].flag}));
}
