import type { AppLocale } from './config';

const ENGLISH_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'] as const;
const GERMAN_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'] as const;

/**
 * Short weekday labels (Monday-first), indexed by ISO weekday number 1..7.
 * Lives outside `translations` so it doesn't widen the auto-derived
 * `TranslationKeys` type with array-valued keys; the generator UI reads it
 * directly when rendering the weekday `<select>`.
 *
 * fr-CH / it-CH inherit the English labels per ADR-0016 until dedicated
 * translations land.
 */
export const weekdayLabels: Record<AppLocale, readonly string[]> = {
  'de-CH': GERMAN_LABELS,
  'en-US': ENGLISH_LABELS,
  // Aliasing the same readonly array lets consumers use reference equality.
  'fr-CH': ENGLISH_LABELS,
  'it-CH': ENGLISH_LABELS,
};
