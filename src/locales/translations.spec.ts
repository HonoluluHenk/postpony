import { describe, expect, it } from 'vitest';
import { getTranslation } from './functions';
import { defaultLocale, translations, type TranslationKeys } from './constants';
import { AppLocales, type AppLocale } from './config';

/**
 * Tied to Issue 02 acceptance criteria:
 * - Auto-derived `TranslationKeys` still resolves when the array-valued
 *   `weekdays_short` key is present.
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

    it('exposes weekdays_short as a 7-entry array derived from en.json', () => {
      const labels = translations['en-US'].weekdays_short;
      expect(Array.isArray(labels)).toBe(true);
      expect(labels).toHaveLength(7);
      expect(labels).toEqual(['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']);
    });

    it('exposes weekdays_short as a 7-entry German array in de-CH', () => {
      const labels = translations['de-CH'].weekdays_short;
      expect(labels).toEqual(['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']);
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

    it('returns the English weekdays_short for fr-CH and it-CH', () => {
      expect(translations['fr-CH'].weekdays_short).toBe(translations['en-US'].weekdays_short);
      expect(translations['it-CH'].weekdays_short).toBe(translations['en-US'].weekdays_short);
    });
  });

  describe('count-parameter interpolation', () => {
    it.each(AppLocales)('interpolates count into proposed_dates_generate_added for %s', (locale) => {
      // de-CH has a dedicated German template, fallback locales share English.
      const template = translations[locale === 'de-CH' ? 'de-CH' : 'en-US'].proposed_dates_generate_added;
      expect(typeof template).toBe('string');
      const expected = (template as string).replace('<%= it.count %>', '12');
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
      expect(record.weekdays_short).toHaveLength(7);
    });
  });
});
