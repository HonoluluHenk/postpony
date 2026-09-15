import { describe, expect, test } from 'vitest';
import { ClickTTError } from './errors';
import { transientScrapeErrorKey } from './scrape-errors';

describe('transientScrapeErrorKey', () => {
  test('maps an upstream click-tt failure to the click-tt error message', () => {
    expect(transientScrapeErrorKey(new ClickTTError('click-tt.ch returned 503')))
      .toBe('scrape_error_click_tt');
  });

  test('maps a transport failure (TypeError) to the unreachable message', () => {
    expect(transientScrapeErrorKey(new TypeError('fetch failed')))
      .toBe('scrape_error_unreachable');
  });

  test('returns undefined for a non-transient error', () => {
    expect(transientScrapeErrorKey(new Error('boom')))
      .toBeUndefined();
  });
});
