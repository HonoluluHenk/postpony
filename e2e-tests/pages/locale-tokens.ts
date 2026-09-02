/**
 * Formats a stored ISO datetime (`YYYY-MM-DDTHH:mm`) into the input-format
 * tokens of the locale the page is currently rendered in. Mirrors the server's
 * `formatIsoToLocaleTokens`; kept small because the e2e suite cannot import
 * from `src/`.
 */
export function isoToLocaleTokens(lang: string | null, iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(iso);
  if (!match) {
    return iso;
  }
  const [, year, month, day, hour, minute] = match;
  if (lang === 'en-US') {
    const hour12 = Number(hour) % 12 || 12;
    const ampm = Number(hour) < 12 ? 'am' : 'pm';
    return `${month}/${day}/${year} ${String(hour12)
      .padStart(2, '0')}:${minute} ${ampm}`;
  }
  return `${day}.${month}.${year} ${hour}:${minute}`;
}

/**
 * Formats a stored ISO date (`YYYY-MM-DD`, the generator's From/To fields) into
 * the input-format date tokens of the locale the page is currently rendered in.
 * Mirrors the server's `formatIsoToDateOnlyLocaleTokens`; kept small because the
 * e2e suite cannot import from `src/`.
 */
export function isoToLocaleDateTokens(lang: string | null, iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) {
    return iso;
  }
  const [, year, month, day] = match;
  if (lang === 'en-US') {
    return `${month}/${day}/${year}`;
  }
  return `${day}.${month}.${year}`;
}
