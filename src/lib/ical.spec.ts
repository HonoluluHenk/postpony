import { describe, expect, test } from 'vitest';
import { aProposedDate, aSession } from './__test-utils__/builders';
import { CLASH_BUFFER_HOURS } from './clashes';
import { buildIcal, icalFilename, icalResponseHeaders } from './ical';
import type { Postponement, Venue } from './models';

const BASE_URL = 'https://game-scheduler.localhost:3000';

function venue(overrides: Partial<Venue> = {}): Venue {
  return {
    venueNumber: 1,
    name: 'Turnhalle orange',
    shortName: 'Turnhalle orange',
    address: 'Dennigkofenweg 169',
    postalCode: '3072',
    city: 'Ostermundigen',
    ...overrides,
  };
}

/** Splits the serialized calendar into physical lines (after folding). */
function lines(ical: string): string[] {
  return ical.split('\r\n');
}

/** Splits into content lines, keeping each physical (folded) line separate. */
function contentLines(ical: string): string[] {
  return ical.split('\r\n').filter((line) => line.length > 0);
}

function propertyLines(ical: string, name: string): string[] {
  return contentLines(ical).filter((line) => line.startsWith(name));
}

function eventBlock(ical: string, uid: string): string {
  const start = ical.indexOf(`UID:${uid}@postpony`);
  expect(start).toBeGreaterThan(-1);
  const end = ical.indexOf('END:VEVENT', start);
  return ical.slice(start, end);
}

describe('buildIcal', () => {
  test('emits a VCALENDAR with the standard header fields and the match name as calendar name', () => {
    const session = aSession({
      name: 'Thun vs Ostermundigen',
      proposedDates: [aProposedDate()],
    });

    const ical = buildIcal(session, {baseUrl: BASE_URL, locale: 'de-CH', now: new Date('2026-09-01T10:00:00Z')});

    expect(ical)
      .toMatch(/^BEGIN:VCALENDAR\r\n/);
    expect(ical)
      .toMatch(/END:VCALENDAR\r\n$/);
    expect(contentLines(ical))
      .toEqual(expect.arrayContaining([
        'VERSION:2.0',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'X-WR-CALNAME:Thun vs Ostermundigen',
      ]));
    expect(ical)
      .toMatch(/PRODID:.+/);
  });

  test('emits one VEVENT per votable date in ascending order and excludes non-votable dates', () => {
    const session = aSession({
      status: 'Voting',
      proposedDates: [
        aProposedDate({id: 'pd-later', dateTimeRange: {start: '2026-09-12T18:00', end: '2026-09-12T18:00'}, votable: true}),
        aProposedDate({id: 'pd-closed', dateTimeRange: {start: '2026-09-01T18:00', end: '2026-09-01T18:00'}, votable: false}),
        aProposedDate({id: 'pd-earlier', dateTimeRange: {start: '2026-09-05T18:00', end: '2026-09-05T18:00'}, votable: true}),
      ],
    });

    const ical = buildIcal(session, {baseUrl: BASE_URL, locale: 'de-CH', now: new Date('2026-09-01T10:00:00Z')});

    const uidLines = propertyLines(ical, 'UID:').map((line) => line.slice('UID:'.length));
    expect(uidLines)
      .toEqual(['pd-earlier@postpony', 'pd-later@postpony']);
    expect(ical)
      .not
      .toContain('pd-closed@postpony');
  });

  test('orders dates with identical starts by id as a deterministic tie-break', () => {
    const session = aSession({
      status: 'Voting',
      proposedDates: [
        aProposedDate({id: 'pd-b', dateTimeRange: {start: '2026-09-05T18:00', end: '2026-09-05T18:00'}}),
        aProposedDate({id: 'pd-a', dateTimeRange: {start: '2026-09-05T18:00', end: '2026-09-05T18:00'}}),
      ],
    });

    const ical = buildIcal(session, {baseUrl: BASE_URL, locale: 'de-CH', now: new Date('2026-09-01T10:00:00Z')});

    const uidLines = propertyLines(ical, 'UID:').map((line) => line.slice('UID:'.length));
    expect(uidLines)
      .toEqual(['pd-a@postpony', 'pd-b@postpony']);
  });

  test('marks the locked date STATUS:CONFIRMED and every other date TENTATIVE', () => {
    const session = aSession({
      status: 'Confirmed',
      confirmedProposedDateId: 'pd-confirmed',
      proposedDates: [
        aProposedDate({id: 'pd-confirmed', dateTimeRange: {start: '2026-09-05T18:00', end: '2026-09-05T18:00'}}),
        aProposedDate({id: 'pd-other', dateTimeRange: {start: '2026-09-12T18:00', end: '2026-09-12T18:00'}}),
      ],
    });

    const ical = buildIcal(session, {baseUrl: BASE_URL, locale: 'de-CH', now: new Date('2026-09-01T10:00:00Z')});

    expect(eventBlock(ical, 'pd-confirmed'))
      .toContain('STATUS:CONFIRMED');
    expect(eventBlock(ical, 'pd-other'))
      .toContain('STATUS:TENTATIVE');
  });

  test('treats the formerly-confirmed date as TENTATIVE again after a reopen', () => {
    const session = aSession({
      status: 'Voting',
      reopenCount: 1,
      confirmedProposedDateId: 'pd-confirmed',
      proposedDates: [
        aProposedDate({id: 'pd-confirmed', dateTimeRange: {start: '2026-09-05T18:00', end: '2026-09-05T18:00'}}),
      ],
    });

    const ical = buildIcal(session, {baseUrl: BASE_URL, locale: 'de-CH', now: new Date('2026-09-01T10:00:00Z')});

    expect(ical)
      .toContain('STATUS:TENTATIVE');
    expect(ical)
      .not
      .toContain('STATUS:CONFIRMED');
  });

  test('encodes DTSTART as Europe/Zurich wall-clock and DTEND = DTSTART + CLASH_BUFFER_HOURS', () => {
    const session = aSession({
      proposedDates: [
        aProposedDate({dateTimeRange: {start: '2026-09-05T18:00', end: '2026-09-05T18:00'}}),
      ],
    });

    const ical = buildIcal(session, {baseUrl: BASE_URL, locale: 'de-CH', now: new Date('2026-09-01T10:00:00Z')});

    const block = eventBlock(ical, 'proposed-date-1');
    expect(block)
      .toContain('DTSTART;TZID=Europe/Zurich:20260905T180000');
    expect(block)
      .toContain(`DTEND;TZID=Europe/Zurich:20260905T${String(18 + CLASH_BUFFER_HOURS).padStart(2, '0')}0000`);
  });

  test('resolves LOCATION via the stored venueNumber and falls back to venue 1 when absent', () => {
    const session = aSession({
      venues: [
        venue({venueNumber: 1, name: 'Turnhalle orange', address: 'Dennigkofenweg 169', postalCode: '3072', city: 'Ostermundigen'}),
        venue({venueNumber: 2, name: 'Turnhalle grün', address: 'Dennigkofenweg 170', postalCode: '3072', city: 'Ostermundigen'}),
      ],
      proposedDates: [
        aProposedDate({id: 'pd-2', venueNumber: 2}),
        aProposedDate({id: 'pd-legacy', venueNumber: undefined}),
      ],
    });

    const ical = buildIcal(session, {baseUrl: BASE_URL, locale: 'de-CH', now: new Date('2026-09-01T10:00:00Z')});

    // Unfold continuation lines so the logical content line can be asserted whole.
    const unfolded = ical.replace(/\r\n /g, '');

    // Commas are RFC-escaped in the raw value, so assert on comma-free substrings.
    const block2 = eventBlock(unfolded, 'pd-2');
    expect(block2)
      .toContain('LOCATION:Turnhalle grün');
    expect(block2)
      .toContain('Dennigkofenweg 170');
    expect(block2)
      .toContain('3072 Ostermundigen');
    const blockLegacy = eventBlock(unfolded, 'pd-legacy');
    expect(blockLegacy)
      .toContain('LOCATION:Turnhalle orange');
    expect(blockLegacy)
      .toContain('Dennigkofenweg 169');
  });

  test('omits LOCATION when the venue cannot be resolved (no scraped venues)', () => {
    const session = aSession({
      venues: [],
      proposedDates: [aProposedDate()],
    });

    const ical = buildIcal(session, {baseUrl: BASE_URL, locale: 'de-CH', now: new Date('2026-09-01T10:00:00Z')});

    expect(eventBlock(ical, 'proposed-date-1'))
      .not
      .toContain('LOCATION:');
  });

  test('builds SUMMARY as "Verschiebung: <match> (<home> vs <guest>)"', () => {
    const session = aSession({
      name: 'Thun vs Ostermundigen',
      homeTeam: 'Thun',
      guestTeam: 'Ostermundigen',
      proposedDates: [aProposedDate()],
    });

    const ical = buildIcal(session, {baseUrl: BASE_URL, locale: 'de-CH', now: new Date('2026-09-01T10:00:00Z')});

    expect(ical)
      .toContain('SUMMARY:Verschiebung: Thun vs Ostermundigen (Thun vs Ostermundigen)');
  });

  test('puts the locale-formatted original match date and the baseUrl link into DESCRIPTION', () => {
    const session = aSession({
      originalMatchDateTime: '2026-08-29T16:00',
      proposedDates: [aProposedDate()],
    });

    const icalDe = buildIcal(session, {baseUrl: BASE_URL, locale: 'de-CH', now: new Date('2026-09-01T10:00:00Z')});
    const icalEn = buildIcal(session, {baseUrl: BASE_URL, locale: 'en-US', now: new Date('2026-09-01T10:00:00Z')});

    // Unfold continuation lines so the logical DESCRIPTION can be asserted whole.
    const blockDe = eventBlock(icalDe.replace(/\r\n /g, ''), 'proposed-date-1');
    expect(blockDe)
      .toContain('29.08.2026 16:00');
    expect(blockDe)
      .toContain(`${BASE_URL}/edit/${session.id}`);
    const blockEn = eventBlock(icalEn.replace(/\r\n /g, ''), 'proposed-date-1');
    expect(blockEn)
      .toContain('08/29/2026 04:00 pm');
  });

  test('keeps UID identical across two builds of the same session regardless of DTSTAMP', () => {
    const session = aSession({
      proposedDates: [
        aProposedDate({id: 'pd-1'}),
        aProposedDate({id: 'pd-2'}),
      ],
    });

    const first = buildIcal(session, {baseUrl: BASE_URL, locale: 'de-CH', now: new Date('2026-09-01T10:00:00Z')});
    const second = buildIcal(session, {baseUrl: BASE_URL, locale: 'de-CH', now: new Date('2026-09-02T10:00:00Z')});

    expect(propertyLines(first, 'UID:'))
      .toEqual(propertyLines(second, 'UID:'));
    expect(first)
      .not
      .toBe(second);
  });

  test('serializes with CRLF line endings and escapes text values', () => {
    const session = aSession({
      name: 'Special; Match, Co',
      homeTeam: 'Thun',
      guestTeam: 'Ostermundigen',
      venues: [venue({name: 'Turnhalle, orange; UG'})],
      proposedDates: [aProposedDate()],
    });

    const ical = buildIcal(session, {baseUrl: BASE_URL, locale: 'de-CH', now: new Date('2026-09-01T10:00:00Z')});

    expect(ical)
      .not
      .toMatch(/(^|[^\r])\n/);
    expect(lines(ical))
      .toContain('X-WR-CALNAME:Special\\; Match\\, Co');
    expect(ical)
      .toContain('SUMMARY:Verschiebung: Special\\; Match\\, Co (Thun vs Ostermundigen)');
    expect(ical)
      .toContain('LOCATION:Turnhalle\\, orange\\; UG\\, Dennigkofenweg 169\\, 3072 Ostermundigen');
  });

  test('escapes newlines in text values as \\n', () => {
    const session = aSession({
      name: 'Line One\nLine Two',
      proposedDates: [aProposedDate()],
    });

    const ical = buildIcal(session, {baseUrl: BASE_URL, locale: 'de-CH', now: new Date('2026-09-01T10:00:00Z')});

    expect(ical)
      .toContain('X-WR-CALNAME:Line One\\nLine Two');
  });

  test('folds content lines at 75 octets with a leading-space continuation', () => {
    const session = aSession({
      venues: [
        venue({
          name: 'Turnhalle orange, UG, Schule Dennigkofen, Schulhausstrasse 12',
          address: 'Dennigkofenweg 169, 1. Obergeschoss, Eingang West, Postfach 22',
        }),
      ],
      proposedDates: [aProposedDate()],
    });

    const ical = buildIcal(session, {baseUrl: BASE_URL, locale: 'de-CH', now: new Date('2026-09-01T10:00:00Z')});

    const encoder = new TextEncoder();
    for (const line of lines(ical)) {
      expect(encoder.encode(line).length)
        .toBeLessThanOrEqual(75);
    }
    expect(ical)
      .toMatch(/\r\n /);
  });

  test('emits an empty VCALENDAR with no VEVENT when nothing is votable', () => {
    const session = aSession({
      proposedDates: [aProposedDate({votable: false})],
    });

    const ical = buildIcal(session, {baseUrl: BASE_URL, locale: 'de-CH', now: new Date('2026-09-01T10:00:00Z')});

    expect(ical)
      .not
      .toContain('VEVENT');
    expect(ical)
      .toContain('BEGIN:VCALENDAR');
  });

  test('emits DTSTAMP in UTC format from the now seam', () => {
    const session = aSession({proposedDates: [aProposedDate()]});

    const ical = buildIcal(session, {baseUrl: BASE_URL, locale: 'de-CH', now: new Date('2026-09-01T10:00:00Z')});

    expect(ical)
      .toContain('DTSTAMP:20260901T100000Z');
  });

  test('accepts Proposed Dates stored with minute precision', () => {
    const session = aSession({
      proposedDates: [aProposedDate({dateTimeRange: {start: '2026-09-05T18:00', end: '2026-09-05T18:00'}})] as Postponement['proposedDates'],
    });

    const ical = buildIcal(session, {baseUrl: BASE_URL, locale: 'de-CH', now: new Date('2026-09-01T10:00:00Z')});

    expect(eventBlock(ical, 'proposed-date-1'))
      .toContain('DTSTART;TZID=Europe/Zurich:20260905T180000');
  });
});

describe('icalFilename', () => {
  test('keeps a plain match name and appends the .ics extension', () => {
    expect(icalFilename('Thun vs Ostermundigen'))
      .toBe('Thun vs Ostermundigen.ics');
  });

  test('strips unsafe and non-ASCII characters out of the download filename', () => {
    expect(icalFilename('A/B:C*D?E<F>G|H"I'))
      .toBe('A_B_C_D_E_F_G_H_I.ics');
    expect(icalFilename('Ostermundigen vs Thun \u2013 Jan 14, 2027, 12:00 AM'))
      .toBe('Ostermundigen vs Thun _ Jan 14_ 2027_ 12_00 AM.ics');
  });

  test('collapses CR/LF to a space so the filename never breaks the header', () => {
    expect(icalFilename('Line One\r\nLine Two'))
      .toBe('Line One Line Two.ics');
  });

  test('falls back to a placeholder stem for a blank or unsafe-only name', () => {
    expect(icalFilename(''))
      .toBe('postponement.ics');
    expect(icalFilename('***'))
      .toBe('postponement.ics');
  });
});

describe('icalResponseHeaders', () => {
  test('returns text/calendar with an attachment content-disposition', () => {
    expect(icalResponseHeaders('match.ics'))
      .toEqual({
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'attachment; filename="match.ics"',
      });
  });
});