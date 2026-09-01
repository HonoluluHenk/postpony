import { describe, expect, it } from 'vitest';
import { AppLocales, inputFormat, languageOptions, localeConfig, localeConfigs } from './config';

describe('locale config', () => {
  it('defines exactly the four supported AppLocales', () => {
    expect(AppLocales)
      .toEqual(['de-CH', 'fr-CH', 'it-CH', 'en-US']);
  });

  it.each(AppLocales)('provides a complete config for %s', (locale) => {
    const config = localeConfig(locale);
    expect(config.intlTag)
      .toBe(locale);
    expect(config.dateFormat)
      .toBeTruthy();
    expect(config.timeFormat)
      .toBeTruthy();
    expect(typeof config.clock24)
      .toBe('boolean');
    expect(typeof config.dayFirst)
      .toBe('boolean');
    expect(config.label)
      .toBeTruthy();
    expect(config.flag)
      .toBeTruthy();
  });

  it('gives the CH locales a day-first 24h format and en-US a month-first 12h format', () => {
    for (const locale of ['de-CH', 'fr-CH', 'it-CH'] as const) {
      expect(localeConfig(locale).dayFirst)
        .toBe(true);
      expect(localeConfig(locale).clock24)
        .toBe(true);
    }
    expect(localeConfig('en-US').dayFirst)
      .toBe(false);
    expect(localeConfig('en-US').clock24)
      .toBe(false);
  });

  it('builds the combined input-format tokens from the date and time parts', () => {
    expect(inputFormat('de-CH'))
      .toBe('dd.MM.yyyy HH:mm');
    expect(inputFormat('fr-CH'))
      .toBe('dd.MM.yyyy HH:mm');
    expect(inputFormat('it-CH'))
      .toBe('dd.MM.yyyy HH:mm');
    expect(inputFormat('en-US'))
      .toBe('MM/dd/yyyy hh:mm aa');
  });

  it('exposes a native label for each locale for the header dropdown', () => {
    const options = languageOptions();
    expect(options.map((option) => option.code))
      .toEqual([...AppLocales]);
    for (const option of options) {
      expect(option.label)
        .toBe(localeConfigs[option.code].label);
      expect(option.flag)
        .toBe(localeConfigs[option.code].flag);
    }
  });

  it('maps each locale to the flag of its language country', () => {
    expect(localeConfig('de-CH').flag)
      .toBe('🇩🇪');
    expect(localeConfig('fr-CH').flag)
      .toBe('🇫🇷');
    expect(localeConfig('it-CH').flag)
      .toBe('🇮🇹');
    expect(localeConfig('en-US').flag)
      .toBe('🇬🇧');
  });
});
