import { describe, expect, it } from 'vitest';
import { getTranslation, type TranslationKeys } from '../../locales';
import { controlNameWithDate } from './control-with-date';

function t(locale: 'en-US' | 'de-CH'): (key: TranslationKeys, params?: Record<string, string>) => string {
  return (key, params) => getTranslation(locale, key, params);
}

describe('controlNameWithDate', () => {
  it('composes the translated control name with the row display string', () => {
    expect(controlNameWithDate(t('en-US'), 'delete_proposed_date', 'Tu, Sep 1, 2026, 8:00 PM'))
      .toBe('Delete · Tu, Sep 1, 2026, 8:00 PM');
    expect(controlNameWithDate(t('en-US'), 'votable_toggle', 'Tu, Sep 1, 2026, 8:00 PM'))
      .toBe('Allow voting · Tu, Sep 1, 2026, 8:00 PM');
    expect(controlNameWithDate(t('en-US'), 'confirm_date', 'Tu, Sep 1, 2026, 8:00 PM'))
      .toBe('Confirm Date · Tu, Sep 1, 2026, 8:00 PM');
  });

  it('uses the German control names and date wording', () => {
    expect(controlNameWithDate(t('de-CH'), 'delete_proposed_date', 'Di, 1. Sept. 2026, 20:00'))
      .toBe('Löschen · Di, 1. Sept. 2026, 20:00');
    expect(controlNameWithDate(t('de-CH'), 'confirm_date', 'Di, 1. Sept. 2026, 20:00'))
      .toBe('Termin bestätigen · Di, 1. Sept. 2026, 20:00');
  });
});