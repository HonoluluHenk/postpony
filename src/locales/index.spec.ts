import { describe, expect, it } from 'vitest';
import { AppLocales, isLocale } from './index';

describe('locales index', () => {
  describe('isLocale', () => {
    it.each(
      AppLocales,
    )('should return true for valid locale: %s', (locale) => {
      expect(isLocale(locale))
        .toBe(true);
    });

    it.each([
      ['fr'],
      ['de'],
      ['en'],
      [''],
      ['DE-CH'],
    ])('should return false for invalid string: %s', (value) => {
      expect(isLocale(value))
        .toBe(false);
    });

    it.each([
      [null],
      [undefined],
      [123],
      [{}],
      [[]],
    ])('should return false for non-string value: %s', (value) => {
      expect(isLocale(value))
        .toBe(false);
    });
  });

});
