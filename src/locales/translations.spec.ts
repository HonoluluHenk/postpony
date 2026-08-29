import { describe, expect, it } from 'vitest';
import { getTranslation } from './functions';
import { defaultLocale, translations, type TranslationKeys } from './constants';
import { AppLocales, type AppLocale } from './config';
import { weekdayLabels } from './weekdays';

/**
 * Tied to Issue 02 acceptance criteria:
 * - Auto-derived `TranslationKeys` still resolves when new generator keys land.
 * - fr-CH / it-CH inherit English strings per ADR-0016; the fallback is
 *   observable through `getTranslation` and `translations[locale]`.
 * - `count`-parameter interpolation works for `proposed_dates_generate_added`
 *   in both the dedicated (en-US, de-CH) and fallback (fr-CH, it-CH) locales.
 */
const NEW_STRING_KEYS = [
  'proposed_dates_generate_section',
  'proposed_dates_generate_help',
  'proposed_dates_generate_button',
  'proposed_dates_generate_added',
  'proposed_dates_generate_none',
  'proposed_dates_generate_add_row',
  'proposed_dates_generate_remove_row',
  'proposed_dates_generate_no_anchor',
  'proposed_dates_generate_weekday_label',
  'proposed_dates_generate_time_label',
] as const satisfies readonly TranslationKeys[];

describe('translations registry', () => {
  describe('auto-derived key set', () => {
    it('includes every new proposed-date-generator key as a TranslationKeys member', () => {
      for (const key of NEW_STRING_KEYS) {
        expect(translations['de-CH'][key])
          .toEqual(expect.any(String));
        expect(translations['en-US'][key])
          .toEqual(expect.any(String));
      }
    });
  });

  describe('weekdayLabels', () => {
    it('exposes a 7-entry English array indexed Monday-first', () => {
      expect(weekdayLabels['en-US']).toEqual(['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']);
    });

    it('exposes a 7-entry German array in de-CH', () => {
      expect(weekdayLabels['de-CH']).toEqual(['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']);
    });

    it('returns the English weekdayLabels for fr-CH and it-CH', () => {
      expect(weekdayLabels['fr-CH']).toBe(weekdayLabels['en-US']);
      expect(weekdayLabels['it-CH']).toBe(weekdayLabels['en-US']);
    });
  });

  describe('fr-CH / it-CH English fallback (ADR-0016)', () => {
    it('shares the same translation record object as en-US for fallback locales', () => {
      expect(translations['fr-CH']).toBe(translations['en-US']);
      expect(translations['it-CH']).toBe(translations['en-US']);
      expect(translations['de-CH']).not.toBe(translations['en-US']);
    });

    it.each(['fr-CH', 'it-CH'] as const)('falls back to English for %s on every new key', (locale) => {
      for (const key of NEW_STRING_KEYS) {
        expect(getTranslation(locale, key)).toBe(translations['en-US'][key]);
      }
    });
  });

  describe('count-parameter interpolation', () => {
    it.each(AppLocales)('interpolates count into proposed_dates_generate_added for %s', (locale) => {
      const template = translations[locale === 'de-CH' ? 'de-CH' : 'en-US'].proposed_dates_generate_added;
      const expected = template.replace('<%= it.count %>', '12');
      expect(getTranslation(locale, 'proposed_dates_generate_added', {count: '12'})).toBe(expected);
    });

    it('uses the dedicated German translation when defaultLocale is de-CH', () => {
      const rendered = getTranslation(defaultLocale, 'proposed_dates_generate_added', {count: '3'});
      expect(rendered).toBe('3 Termine hinzugefügt');
    });

    it('uses English for fallback locales with count interpolation', () => {
      expect(getTranslation('fr-CH', 'proposed_dates_generate_added', {count: '5'}))
        .toBe('5 dates added');
      expect(getTranslation('it-CH', 'proposed_dates_generate_added', {count: '5'}))
        .toBe('5 dates added');
    });
  });

  describe('AppLocale coverage (sanity)', () => {
    it.each(['de-CH', 'en-US', 'fr-CH', 'it-CH'] satisfies AppLocale[])('%s has every new key present', (locale) => {
      const record = translations[locale];
      for (const key of NEW_STRING_KEYS) {
        expect(record[key]).toBeTruthy();
      }
      expect(weekdayLabels[locale]).toHaveLength(7);
    });
  });
});
