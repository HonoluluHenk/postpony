import { Temporal } from '@js-temporal/polyfill';
import { describe, expect, it, test } from 'vitest';
import { weekdayLabels } from '../locales';
import {
  DateTimeRange,
  doRangesOverlap,
  formatIsoToDateOnlyLocaleTokens,
  formatIsoToLocaleTokens,
  formatLocalizedDateTime,
  formatProposedDateDisplay,
  intersectDateTimeRanges,
  intersectRanges,
  parseClickTtDateTime,
  parseLocaleDateOnly,
  parseLocaleDateTime,
  parseLocaleTimeOnly,
} from './temporal-utils';

describe('Temporal Utils', () => {
  test('DateTimeRange overlap and intersection', () => {
    const range1: DateTimeRange = {
      start: Temporal.PlainDateTime.from('2026-05-10T10:00:00'),
      end: Temporal.PlainDateTime.from('2026-05-10T12:00:00'),
    };
    const range2: DateTimeRange = {
      start: Temporal.PlainDateTime.from('2026-05-10T11:00:00'),
      end: Temporal.PlainDateTime.from('2026-05-10T13:00:00'),
    };

    expect(doRangesOverlap(range1, range2))
      .toBe(true);

    const intersection = intersectDateTimeRanges(range1, range2);
    expect(intersection)
      .not
      .toBeNull();
    expect(intersection?.start.toString())
      .toBe('2026-05-10T11:00:00');
    expect(intersection?.end.toString())
      .toBe('2026-05-10T12:00:00');
  });

  test('doRangesOverlap should correctly identify overlapping ranges', () => {
    const range1: DateTimeRange = {
      start: Temporal.PlainDateTime.from('2026-05-10T10:00:00'),
      end: Temporal.PlainDateTime.from('2026-05-10T12:00:00'),
    };
    const range2: DateTimeRange = {
      start: Temporal.PlainDateTime.from('2026-05-10T11:00:00'),
      end: Temporal.PlainDateTime.from('2026-05-10T13:00:00'),
    };

    expect(doRangesOverlap(range1, range2))
      .toBe(true);
  });

  test('doRangesOverlap should correctly identify non-overlapping ranges', () => {
    const range1: DateTimeRange = {
      start: Temporal.PlainDateTime.from('2026-05-10T10:00:00'),
      end: Temporal.PlainDateTime.from('2026-05-10T11:00:00'),
    };
    const range2: DateTimeRange = {
      start: Temporal.PlainDateTime.from('2026-05-10T12:00:00'),
      end: Temporal.PlainDateTime.from('2026-05-10T13:00:00'),
    };

    expect(doRangesOverlap(range1, range2))
      .toBe(false);
  });

  test('intersectRanges should return the correct intersection', () => {
    const start1 = Temporal.PlainDateTime.from('2026-05-10T10:00:00');
    const end1 = Temporal.PlainDateTime.from('2026-05-10T12:00:00');

    const start2 = Temporal.PlainDateTime.from('2026-05-10T11:00:00');
    const end2 = Temporal.PlainDateTime.from('2026-05-10T13:00:00');

    const intersection = intersectRanges(start1, end1, start2, end2);
    expect(intersection)
      .not
      .toBeNull();
    expect(intersection?.start.toString())
      .toBe('2026-05-10T11:00:00');
    expect(intersection?.end.toString())
      .toBe('2026-05-10T12:00:00');
  });

  test('formatLocalizedDateTime should format correctly for German', () => {
    const dt = Temporal.PlainDateTime.from('2026-05-10T10:30:00');
    const formatted = formatLocalizedDateTime(dt, 'de-CH');
    // Result depends on the environment's locale data, but we can check if it contains expected parts
    expect(formatted)
      .toContain('10.05.2026');
    expect(formatted)
      .toContain('10:30');
  });

  test('formatProposedDateDisplay prefixes the locale short-weekday label', () => {
    const iso = '2026-05-10T10:30:00';
    const dt = Temporal.PlainDateTime.from(iso);
    const weekday = weekdayLabels['en-US'][dt.dayOfWeek - 1];
    expect(formatProposedDateDisplay(iso, 'en-US'))
      .toBe(`${weekday}, ${formatLocalizedDateTime(dt, 'en-US')}`);
    expect(formatProposedDateDisplay(iso, 'de-CH'))
      .toBe(`${weekdayLabels['de-CH'][dt.dayOfWeek - 1]}, ${formatLocalizedDateTime(dt, 'de-CH')}`);
  });

  test('parseClickTtDateTime should convert a well-formed date and time', () => {
    expect(parseClickTtDateTime('03.09.2025', '20:00'))
      .toBe('2025-09-03T20:00');
  });

  test('parseClickTtDateTime should tolerate trailing junk in the time', () => {
    expect(parseClickTtDateTime('11.12.2025', '19:45 v'))
      .toBe('2025-12-11T19:45');
  });

  test('parseClickTtDateTime should return undefined for a malformed date', () => {
    expect(parseClickTtDateTime('2025-09-03', '20:00'))
      .toBeUndefined();
  });

  test('parseClickTtDateTime should return undefined for a malformed time', () => {
    expect(parseClickTtDateTime('03.09.2025', 'tba'))
      .toBeUndefined();
  });

  describe('parseLocaleDateTime', () => {
    it.each(['de-CH', 'fr-CH', 'it-CH'] as const)(
      'parses a canonical %s 24h input',
      (locale) => {
        expect(parseLocaleDateTime('02.08.2026 20:00', locale)
          ?.toString())
          .toBe('2026-08-02T20:00:00');
      },
    );

    it.each(['de-CH', 'fr-CH', 'it-CH'] as const)(
      'tolerates missing leading zeros in %s',
      (locale) => {
        expect(parseLocaleDateTime('2.8.2026 8:5', locale)
          ?.toString())
          .toBe('2026-08-02T08:05:00');
      },
    );

    it.each(['de-CH', 'fr-CH', 'it-CH'] as const)(
      'accepts / and - as date separators in %s',
      (locale) => {
        expect(parseLocaleDateTime('02/08/2026 20:00', locale)
          ?.toString())
          .toBe('2026-08-02T20:00:00');
        expect(parseLocaleDateTime('02-08-2026 20:00', locale)
          ?.toString())
          .toBe('2026-08-02T20:00:00');
      },
    );

    it('rejects a mixed separator date in de-CH', () => {
      expect(parseLocaleDateTime('02.08/2026 20:00', 'de-CH'))
        .toBeUndefined();
    });

    it('rejects a day/month swapped order in de-CH', () => {
      expect(parseLocaleDateTime('08.02.2026 20:00', 'de-CH')
        ?.toString())
        .toBe('2026-02-08T20:00:00');
    });

    it('rejects an impossible date in de-CH', () => {
      expect(parseLocaleDateTime('32.08.2026 20:00', 'de-CH'))
        .toBeUndefined();
    });

    it('rejects an impossible month in de-CH', () => {
      expect(parseLocaleDateTime('02.13.2026 20:00', 'de-CH'))
        .toBeUndefined();
    });

    it('rejects a 24h time in de-CH', () => {
      expect(parseLocaleDateTime('02.08.2026 24:00', 'de-CH'))
        .toBeUndefined();
    });

    it('rejects an am/pm time in a 24h locale', () => {
      expect(parseLocaleDateTime('02.08.2026 20:00 pm', 'de-CH'))
        .toBeUndefined();
    });

    it('rejects an empty or blank string in de-CH', () => {
      expect(parseLocaleDateTime('', 'de-CH'))
        .toBeUndefined();
      expect(parseLocaleDateTime('   ', 'de-CH'))
        .toBeUndefined();
    });

    it('parses a canonical en-US 12h input', () => {
      expect(parseLocaleDateTime('08/02/2026 08:00 pm', 'en-US')
        ?.toString())
        .toBe('2026-08-02T20:00:00');
    });

    it('parses en-US am times', () => {
      expect(parseLocaleDateTime('08/02/2026 08:00 am', 'en-US')
        ?.toString())
        .toBe('2026-08-02T08:00:00');
    });

    it('parses en-US uppercase and no-space am/pm markers', () => {
      expect(parseLocaleDateTime('08/02/2026 8:00PM', 'en-US')
        ?.toString())
        .toBe('2026-08-02T20:00:00');
    });

    it('treats en-US 12 pm as noon and 12 am as midnight', () => {
      expect(parseLocaleDateTime('08/02/2026 12:00 pm', 'en-US')
        ?.toString())
        .toBe('2026-08-02T12:00:00');
      expect(parseLocaleDateTime('08/02/2026 12:00 am', 'en-US')
        ?.toString())
        .toBe('2026-08-02T00:00:00');
    });

    it('accepts . and - as date separators in en-US', () => {
      expect(parseLocaleDateTime('08.02.2026 08:00 pm', 'en-US')
        ?.toString())
        .toBe('2026-08-02T20:00:00');
      expect(parseLocaleDateTime('08-02-2026 08:00 pm', 'en-US')
        ?.toString())
        .toBe('2026-08-02T20:00:00');
    });

    it('rejects an en-US time without an am/pm marker', () => {
      expect(parseLocaleDateTime('08/02/2026 08:00', 'en-US'))
        .toBeUndefined();
    });

    it('rejects a 24h time in en-US', () => {
      expect(parseLocaleDateTime('08/02/2026 20:00 pm', 'en-US'))
        .toBeUndefined();
    });

    it('rejects an hour of 0 in en-US', () => {
      expect(parseLocaleDateTime('08/02/2026 0:00 am', 'en-US'))
        .toBeUndefined();
    });
  });

  describe('formatIsoToLocaleTokens', () => {
    it('formats stored ISO (second precision) into CH tokens', () => {
      expect(formatIsoToLocaleTokens('2026-08-02T20:00:00', 'de-CH'))
        .toBe('02.08.2026 20:00');
    });

    it('formats stored ISO into en-US 12h tokens', () => {
      expect(formatIsoToLocaleTokens('2026-08-02T20:00:00', 'en-US'))
        .toBe('08/02/2026 08:00 pm');
    });

    it('formats an en-US morning as am', () => {
      expect(formatIsoToLocaleTokens('2026-08-02T08:05:00', 'en-US'))
        .toBe('08/02/2026 08:05 am');
    });

    it('formats noon and midnight in en-US 12h form', () => {
      expect(formatIsoToLocaleTokens('2026-08-02T12:00:00', 'en-US'))
        .toBe('08/02/2026 12:00 pm');
      expect(formatIsoToLocaleTokens('2026-08-02T00:00:00', 'en-US'))
        .toBe('08/02/2026 12:00 am');
    });

    it('zero-pads day, month, hour and minute', () => {
      expect(formatIsoToLocaleTokens('2026-03-05T09:04:00', 'de-CH'))
        .toBe('05.03.2026 09:04');
    });
  });

  describe('parseLocaleTimeOnly', () => {
    it.each(['de-CH', 'fr-CH', 'it-CH'] as const)(
      'parses a canonical %s 24h HH:mm input',
      (locale) => {
        expect(parseLocaleTimeOnly('20:00', locale)).toEqual({hour: 20, minute: 0});
        expect(parseLocaleTimeOnly('08:05', locale)).toEqual({hour: 8, minute: 5});
      },
    );

    it.each(['de-CH', 'fr-CH', 'it-CH'] as const)(
      'tolerates missing leading zeros in %s',
      (locale) => {
        expect(parseLocaleTimeOnly('8:5', locale)).toEqual({hour: 8, minute: 5});
      },
    );

    it.each(['de-CH', 'fr-CH', 'it-CH'] as const)(
      'ignores trailing seconds in %s but rejects an am/pm marker',
      (locale) => {
        expect(parseLocaleTimeOnly('20:00:30', locale)).toEqual({hour: 20, minute: 0});
        expect(parseLocaleTimeOnly('20:00 pm', locale)).toBeUndefined();
      },
    );

    it.each(['de-CH', 'fr-CH', 'it-CH'] as const)(
      'rejects an out-of-range hour in %s',
      (locale) => {
        expect(parseLocaleTimeOnly('25:00', locale)).toBeUndefined();
      },
    );

    it.each(['de-CH', 'fr-CH', 'it-CH'] as const)(
      'rejects an out-of-range minute in %s',
      (locale) => {
        expect(parseLocaleTimeOnly('12:99', locale)).toBeUndefined();
      },
    );

    it('parses a canonical en-US 12h hh:mm aa input', () => {
      expect(parseLocaleTimeOnly('08:00 pm', 'en-US')).toEqual({hour: 20, minute: 0});
      expect(parseLocaleTimeOnly('08:00 am', 'en-US')).toEqual({hour: 8, minute: 0});
    });

    it('parses en-US 12 pm as noon and 12 am as midnight', () => {
      expect(parseLocaleTimeOnly('12:00 pm', 'en-US')).toEqual({hour: 12, minute: 0});
      expect(parseLocaleTimeOnly('12:00 am', 'en-US')).toEqual({hour: 0, minute: 0});
    });

    it('parses en-US am/pm case-insensitively and with no surrounding whitespace', () => {
      expect(parseLocaleTimeOnly('8:00PM', 'en-US')).toEqual({hour: 20, minute: 0});
      expect(parseLocaleTimeOnly('8:00AM', 'en-US')).toEqual({hour: 8, minute: 0});
    });

    it('ignores trailing seconds in en-US 12h', () => {
      expect(parseLocaleTimeOnly('8:00:30 pm', 'en-US')).toEqual({hour: 20, minute: 0});
    });

    it('rejects en-US without an am/pm marker', () => {
      expect(parseLocaleTimeOnly('08:00', 'en-US')).toBeUndefined();
    });

    it('rejects en-US hour of 0', () => {
      expect(parseLocaleTimeOnly('0:00 am', 'en-US')).toBeUndefined();
    });

    it('rejects en-US out-of-range hour via 12h ("13:00 pm")', () => {
      expect(parseLocaleTimeOnly('13:00 pm', 'en-US')).toBeUndefined();
    });

    it('rejects en-US hour above 12 regardless of marker', () => {
      expect(parseLocaleTimeOnly('15:00 am', 'en-US')).toBeUndefined();
    });

    it('rejects empty or whitespace-only input', () => {
      for (const locale of ['de-CH', 'fr-CH', 'it-CH', 'en-US'] as const) {
        expect(parseLocaleTimeOnly('', locale)).toBeUndefined();
        expect(parseLocaleTimeOnly('   ', locale)).toBeUndefined();
      }
    });
  });

  describe('parseLocaleDateOnly', () => {
    it.each(['de-CH', 'fr-CH', 'it-CH'] as const)(
      'parses a canonical %s day-first input',
      (locale) => {
        expect(parseLocaleDateOnly('02.08.2026', locale))
          .toBe('2026-08-02');
      },
    );

    it('parses a canonical en-US month-first input', () => {
      expect(parseLocaleDateOnly('08/02/2026', 'en-US'))
        .toBe('2026-08-02');
    });

    it.each(['de-CH', 'fr-CH', 'it-CH'] as const)(
      'tolerates missing leading zeros in %s',
      (locale) => {
        expect(parseLocaleDateOnly('2.8.2026', locale))
          .toBe('2026-08-02');
      },
    );

    it('tolerates missing leading zeros in en-US', () => {
      expect(parseLocaleDateOnly('8/2/2026', 'en-US'))
        .toBe('2026-08-02');
    });

    it.each(['de-CH', 'fr-CH', 'it-CH'] as const)(
      'accepts / and - as date separators in %s',
      (locale) => {
        expect(parseLocaleDateOnly('02/08/2026', locale))
          .toBe('2026-08-02');
        expect(parseLocaleDateOnly('02-08-2026', locale))
          .toBe('2026-08-02');
      },
    );

    it('accepts . and - as date separators in en-US', () => {
      expect(parseLocaleDateOnly('08.02.2026', 'en-US'))
        .toBe('2026-08-02');
      expect(parseLocaleDateOnly('08-02-2026', 'en-US'))
        .toBe('2026-08-02');
    });

    it('rejects a mixed separator date in de-CH', () => {
      expect(parseLocaleDateOnly('02.08/2026', 'de-CH'))
        .toBeUndefined();
    });

    it('rejects an impossible date (Feb 30) in de-CH', () => {
      expect(parseLocaleDateOnly('30.02.2026', 'de-CH'))
        .toBeUndefined();
    });

    it('rejects an impossible date (Feb 30) in en-US', () => {
      expect(parseLocaleDateOnly('02/30/2026', 'en-US'))
        .toBeUndefined();
    });

    it('rejects day 32 in de-CH', () => {
      expect(parseLocaleDateOnly('32.08.2026', 'de-CH'))
        .toBeUndefined();
    });

    it('rejects month 13 in de-CH', () => {
      expect(parseLocaleDateOnly('02.13.2026', 'de-CH'))
        .toBeUndefined();
    });

    it('rejects empty or whitespace-only input across all locales', () => {
      for (const locale of ['de-CH', 'fr-CH', 'it-CH', 'en-US'] as const) {
        expect(parseLocaleDateOnly('', locale)).toBeUndefined();
        expect(parseLocaleDateOnly('   ', locale)).toBeUndefined();
      }
    });
  });

  describe('formatIsoToDateOnlyLocaleTokens', () => {
    it('formats ISO date into de-CH day-first tokens', () => {
      expect(formatIsoToDateOnlyLocaleTokens('2026-08-02', 'de-CH'))
        .toBe('02.08.2026');
    });

    it('formats ISO date into en-US month-first tokens', () => {
      expect(formatIsoToDateOnlyLocaleTokens('2026-08-02', 'en-US'))
        .toBe('08/02/2026');
    });

    it('formats ISO date into fr-CH day-first tokens', () => {
      expect(formatIsoToDateOnlyLocaleTokens('2026-03-05', 'fr-CH'))
        .toBe('05.03.2026');
    });

    it('formats ISO date into it-CH day-first tokens', () => {
      expect(formatIsoToDateOnlyLocaleTokens('2026-12-25', 'it-CH'))
        .toBe('25.12.2026');
    });

    it('round-trips de-CH: format then parse', () => {
      const iso = '2026-08-02';
      const formatted = formatIsoToDateOnlyLocaleTokens(iso, 'de-CH');
      expect(parseLocaleDateOnly(formatted, 'de-CH'))
        .toBe(iso);
    });

    it('round-trips en-US: format then parse', () => {
      const iso = '2026-08-02';
      const formatted = formatIsoToDateOnlyLocaleTokens(iso, 'en-US');
      expect(parseLocaleDateOnly(formatted, 'en-US'))
        .toBe(iso);
    });
  });
});
