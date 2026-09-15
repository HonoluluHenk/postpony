import type { TranslationKeys } from '../locales';
import { ClickTTError } from './errors';

/**
 * Classifies a scraping effort that threw into the transient cases the UI can
 * surface with a retry: click-tt reported an error (ClickTTError), or the host
 * was unreachable (fetch rejects a transport failure with a TypeError). Any
 * other error is non-transient and returns undefined, so callers rethrow it.
 */
export function transientScrapeErrorKey(err: unknown): TranslationKeys | undefined {
  if (err instanceof ClickTTError) {
    return 'scrape_error_click_tt';
  }
  // ponytail: Node fetch surfaces DNS/timeout/reset as TypeError ("fetch failed");
  // both classes are transient and share the retryable UX.
  if (err instanceof TypeError) {
    return 'scrape_error_unreachable';
  }
  return undefined;
}
