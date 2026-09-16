import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { App } from '../../../app';
import { aPlayer, aProposedDate, aSession, aVote } from '../../../lib/__test-utils__/builders';
import { fetchClubMeetings, fetchMatches } from '../../../lib/click-tt-scraper';
import { AppError, ClickTTError } from '../../../lib/errors';
import type { Postponement } from '../../../lib/models';
import { generateProposedDates } from '../../../lib/proposed-dates-generator';
import * as temporalUtils from '../../../lib/temporal-utils';
import { createApp, type MockOptions } from '../../../lib/__test-utils__/create-app';
import { hashPassword } from '../../../lib/crypto-utils';
import { handleConfirmDatePost } from './confirm-date-post';
import { handleEditGet } from './edit-id-get';
import { buildOwnTeamView } from './own-team-view';
import { handleEditPlayersPost } from './players-post';
import { handleProposedDateDeletePost } from './proposed-date-delete-post';
import { handleProposedDateVisibilityPost } from './proposed-date-visibility-post';
import { handleEditProposedDatesPost } from './proposed-dates-post';
import { handleRefreshClashesPost } from './refresh-clashes-post';
import { handleReopenPost } from './reopen-post';
import { renderEditPartials } from './render-edit-partials';

vi.mock('../../../lib/click-tt-scraper', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../lib/click-tt-scraper')>();
  return {
    ...actual,
    fetchMatches: vi.fn(),
    fetchClubMeetings: vi.fn(),
  };
});

const mockFetchMatches = vi.mocked(fetchMatches);
const mockFetchClubMeetings = vi.mocked(fetchClubMeetings);

const FIXED_TODAY_ISO = '2026-08-25T08:00';
// en-US date tokens the generator's From/To fields submit for the fixed "today"
// (2026-08-25) and the default windows: anchor+4w and today+4w respectively.
const FROM_TOKEN = '08/25/2026';
const TO_TOKEN_ANCHOR = '09/30/2026';
const TO_TOKEN_TODAY = '09/22/2026';

const ORGANIZER_PASSWORD = 'organizer-pw';
// ponytail: one precomputed hash shared by every seeded session, so the
// organizer-captain guard can be satisfied without a PBKDF2 derivation per test.
const organizerPasswordHash = await hashPassword(ORGANIZER_PASSWORD);

function seedSession(overrides: Parameters<typeof aSession>[0] = {}): Postponement {
  return aSession({organizerCaptainPasswordHash: organizerPasswordHash, ...overrides});
}

function editApp(options: MockOptions = {}): App {
  return createApp({
    ...options,
    queries: {...options.queries, organizerPassword: ORGANIZER_PASSWORD},
  });
}

async function expectForbidden(promise: Promise<Response>): Promise<void> {
  const error = await promise.catch((e: unknown) => e);
  expect(error)
    .toBeInstanceOf(AppError);
  expect((error as AppError).status)
    .toBe(403);
  expect((error as AppError).message)
    .toBe('Invalid organizer password.');
}

describe('edit handlers', () => {

  beforeEach(() => {
    vi.spyOn(temporalUtils, 'nowPlainDateTimeIso')
      .mockReturnValue(FIXED_TODAY_ISO);
    mockFetchMatches.mockReset();
    mockFetchClubMeetings.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('handleEditPlayersPost', () => {
    test('adds a player to a session that has none', async () => {
      const session = seedSession();
      const app = editApp({params: {id: session.id}, body: {playerName: 'Alice'}});
      await app.store.save(session);

      await handleEditPlayersPost(app);

      const stored = await app.store.get(session.id);
      expect(stored?.players)
        .toHaveLength(1);
      expect(stored?.players[0]?.name)
        .toBe('Alice');
      expect(stored?.players[0]?.teamId)
        .toBe('home');
    });

    test('appends to the existing players', async () => {
      const session = seedSession({players: [aPlayer()]});
      const app = editApp({params: {id: session.id}, body: {playerName: 'Bob'}});
      await app.store.save(session);

      await handleEditPlayersPost(app);

      const stored = await app.store.get(session.id);
      expect(stored?.players.map((p) => p.name))
        .toEqual(['Test Player', 'Bob']);
      expect(stored?.players[1]?.name)
        .toBe('Bob');
    });

    test('redirects without adding a player when the name is missing', async () => {
      const session = seedSession();
      const app = editApp({params: {id: session.id}, body: {}});
      await app.store.save(session);

      const response = await handleEditPlayersPost(app);

      const stored = await app.store.get(session.id);
      expect(stored?.players)
        .toHaveLength(0);
      expect(response.status)
        .toBe(302);
    });
  });

  describe('handleEditProposedDatesPost', () => {
    test('adds a proposed date to the session', async () => {
      const session = seedSession();
      const app = editApp({params: {id: session.id}, body: {proposedDateTime: '09/01/2025 08:00 pm'}});
      await app.store.save(session);

      await handleEditProposedDatesPost(app);

      const stored = await app.store.get(session.id);
      expect(stored?.proposedDates)
        .toHaveLength(1);
      const proposedDate = stored?.proposedDates[0];
      expect(proposedDate?.sessionId)
        .toBe(session.id);
      expect(proposedDate?.proposerId)
        .toBe('organizer');
      expect(proposedDate?.dateTimeRange.start)
        .toBe(proposedDate?.dateTimeRange.end);
      expect(proposedDate?.dateTimeRange.start.toString())
        .toBe('2025-09-01T20:00:00');
    });

    test('accepts a tolerant en-US input (no leading zeros, no space before pm) and normalizes to ISO on save', async () => {
      const session = seedSession();
      const app = editApp({params: {id: session.id}, body: {proposedDateTime: '9/1/2025 8:00pm'}});
      await app.store.save(session);

      await handleEditProposedDatesPost(app);

      const stored = await app.store.get(session.id);
      expect(stored?.proposedDates)
        .toHaveLength(1);
      expect(stored?.proposedDates[0]?.dateTimeRange.start.toString())
        .toBe('2025-09-01T20:00:00');
    });

    test('appends to the existing proposed dates', async () => {
      const session = seedSession({proposedDates: [aProposedDate()]});
      const app = editApp({params: {id: session.id}, body: {proposedDateTime: '09/02/2025 06:30 pm'}});
      await app.store.save(session);

      await handleEditProposedDatesPost(app);

      const stored = await app.store.get(session.id);
      expect(stored?.proposedDates.map((d) => d.dateTimeRange.start))
        .toEqual(['2025-09-01T20:00:00', '2025-09-02T18:30:00']);
    });

    test('moves a Draft session to Voting when the first date is added', async () => {
      const session = seedSession();
      const app = editApp({params: {id: session.id}, body: {proposedDateTime: '09/01/2025 08:00 pm'}});
      await app.store.save(session);

      await handleEditProposedDatesPost(app);

      const stored = await app.store.get(session.id);
      expect(stored?.status)
        .toBe('Voting');
      expect(stored?.proposedDates[0]?.votable)
        .toBe(true);
    });

    test('redirects without adding when the datetime is invalid', async () => {
      const session = seedSession();
      const app = editApp({params: {id: session.id}, body: {proposedDateTime: 'not-a-date'}});
      await app.store.save(session);

      const response = await handleEditProposedDatesPost(app);

      const stored = await app.store.get(session.id);
      expect(stored?.proposedDates)
        .toHaveLength(0);
      expect(response.status)
        .toBe(302);
    });

    describe('single-date venue number', () => {
      const twoVenues = [
        {
          venueNumber: 1,
          name: 'Turnhalle orange',
          shortName: 'Turnhalle orange',
          address: 'Dennigkofenweg 169',
          postalCode: '3072',
          city: 'Ostermundigen',
        },
        {
          venueNumber: 2,
          name: 'Turnhalle grün',
          shortName: 'Turnhalle grün',
          address: 'Dennigkofenweg 170',
          postalCode: '3072',
          city: 'Ostermundigen',
        },
      ];

      test('single add with a valid venue number stores it on the ProposedDate', async () => {
        const session = seedSession({venues: twoVenues});
        const app = editApp({
          params: {id: session.id},
          body: {proposedDateTime: '09/01/2025 08:00 pm', venueNumber: '2'},
        });
        await app.store.save(session);

        await handleEditProposedDatesPost(app);

        const stored = await app.store.get(session.id);
        expect(stored?.proposedDates)
          .toHaveLength(1);
        expect(stored?.proposedDates[0]?.venueNumber)
          .toBe(2);
      });

      test('single add with an out-of-range venue number rejects with a translated error in the error container', async () => {
        const session = seedSession({venues: twoVenues});
        const app = editApp({
          params: {id: session.id},
          headers: {'HX-Request': 'true'},
          body: {proposedDateTime: '09/01/2025 08:00 pm', venueNumber: '3'},
        });
        await app.store.save(session);

        const response = await handleEditProposedDatesPost(app);
        const html = await response.text();
        expect(response.status)
          .toBe(400);
        const stored = await app.store.get(session.id);
        expect(stored?.proposedDates)
          .toHaveLength(0);
        expect(html)
          .toContain('id="error-container" hx-swap-oob="true"');
        expect(html)
          .toContain('Please select a valid venue number');
        // the datetime round-trips so the organizer only fixes the venue
        expect(html)
          .toContain('value="09/01/2025 08:00 pm"');
      });

      test('single add with no venues accepts any venue number in 1..10', async () => {
        const session = seedSession();
        const app = editApp({
          params: {id: session.id},
          body: {proposedDateTime: '09/01/2025 08:00 pm', venueNumber: '10'},
        });
        await app.store.save(session);

        await handleEditProposedDatesPost(app);

        const stored = await app.store.get(session.id);
        expect(stored?.proposedDates)
          .toHaveLength(1);
        expect(stored?.proposedDates[0]?.venueNumber)
          .toBe(10);
      });

      test('single add with no venues rejects 11 as out of range', async () => {
        const session = seedSession();
        const app = editApp({
          params: {id: session.id},
          headers: {'HX-Request': 'true'},
          body: {proposedDateTime: '09/01/2025 08:00 pm', venueNumber: '11'},
        });
        await app.store.save(session);

        const response = await handleEditProposedDatesPost(app);
        expect(response.status)
          .toBe(400);
        const stored = await app.store.get(session.id);
        expect(stored?.proposedDates)
          .toHaveLength(0);
      });

      test('single add without a venue number leaves venueNumber undefined (legacy default = venue 1)', async () => {
        const session = seedSession({venues: twoVenues});
        const app = editApp({
          params: {id: session.id},
          body: {proposedDateTime: '09/01/2025 08:00 pm'},
        });
        await app.store.save(session);

        await handleEditProposedDatesPost(app);

        const stored = await app.store.get(session.id);
        expect(stored?.proposedDates)
          .toHaveLength(1);
        expect(stored?.proposedDates[0]?.venueNumber)
          .toBeUndefined();
      });

      test('re-renders the list with the venue badge after a successful add', async () => {
        const session = seedSession({venues: twoVenues});
        const app = editApp({
          params: {id: session.id},
          headers: {'HX-Request': 'true'},
          body: {proposedDateTime: '09/01/2025 08:00 pm', venueNumber: '2'},
        });
        await app.store.save(session);

        const response = await handleEditProposedDatesPost(app);
        const html = await response.text();
        expect(html)
          .toContain('>(2) Turnhalle grün<span class="visually-hidden">2 – Turnhalle grün</span>');
      });
    });

    describe('generator venue number', () => {
      const twoVenues = [
        {
          venueNumber: 1,
          name: 'Turnhalle orange',
          shortName: 'Turnhalle orange',
          address: 'Dennigkofenweg 169',
          postalCode: '3072',
          city: 'Ostermundigen',
        },
        {
          venueNumber: 2,
          name: 'Turnhalle grün',
          shortName: 'Turnhalle grün',
          address: 'Dennigkofenweg 170',
          postalCode: '3072',
          city: 'Ostermundigen',
        },
      ];

      test('generator with a valid venue number stores it on every generated date', async () => {
        const session = seedSession({
          venues: twoVenues,
          originalMatchDateTime: '2026-09-02T16:00',
          proposedDates: [],
          status: 'Draft',
        });
        const app = editApp({
          params: {id: session.id},
          headers: {'HX-Request': 'true'},
          body: {
            generate: 'tuple',
            'time[]': ['8:00 pm', '9:00 pm'],
            venueNumber: '2',
            fromDate: FROM_TOKEN,
            toDate: TO_TOKEN_ANCHOR,
          },
        });
        await app.store.save(session);

        await handleEditProposedDatesPost(app);

        const stored = await app.store.get(session.id);
        expect(stored?.proposedDates.length)
          .toBeGreaterThan(0);
        for (const proposedDate of stored?.proposedDates ?? []) {
          expect(proposedDate.venueNumber)
            .toBe(2);
        }
      });

      test('generator with an out-of-range venue number rejects with a translated error and preserves the submitted times', async () => {
        const session = seedSession({
          venues: twoVenues,
          originalMatchDateTime: '2026-09-02T16:00',
          proposedDates: [],
          status: 'Draft',
        });
        const app = editApp({
          params: {id: session.id},
          headers: {'HX-Request': 'true'},
          body: {
            generate: 'tuple',
            'time[]': ['8:00 pm', '9:00 pm'],
            venueNumber: '3',
            fromDate: FROM_TOKEN,
            toDate: TO_TOKEN_ANCHOR,
          },
        });
        await app.store.save(session);

        const response = await handleEditProposedDatesPost(app);
        const html = await response.text();
        expect(response.status)
          .toBe(400);
        const stored = await app.store.get(session.id);
        expect(stored?.proposedDates)
          .toHaveLength(0);
        expect(stored?.status)
          .toBe('Draft');
        expect(html)
          .toContain('Please select a valid venue number');
        // the submitted times round-trip so the organizer only fixes the venue
        expect(html)
          .toContain('value="8:00 pm"');
        expect(html)
          .toContain('value="9:00 pm"');
      });
    });

    describe('venue-aware dedup', () => {
      const existingDateIso = '2026-08-31T20:00';

      function sessionWithExistingDate(): Postponement {
        return seedSession({
          originalMatchDateTime: '2026-09-02T16:00',
          status: 'Draft',
          proposedDates: [
            aProposedDate({
              id: 'pd-existing',
              dateTimeRange: {start: existingDateIso, end: existingDateIso},
              venueNumber: 1,
            }),
          ],
        });
      }

      test('duplicate datetime + same venue → only one exists', async () => {
        const session = sessionWithExistingDate();
        const app = editApp({
          params: {id: session.id},
          headers: {'HX-Request': 'true'},
          body: {
            generate: 'tuple',
            'time[]': ['8:00 pm'],
            venueNumber: '1',
            fromDate: FROM_TOKEN,
            toDate: TO_TOKEN_ANCHOR,
          },
        });
        await app.store.save(session);

        const html = await (await handleEditProposedDatesPost(app)).text();

        const stored = await app.store.get(session.id);
        // the same-datetime/same-venue duplicate is skipped, so only the
        // remaining 4 weekdays are added to the existing date
        expect(stored?.proposedDates.filter((d) => d.dateTimeRange.start === existingDateIso))
          .toHaveLength(1);
        expect(stored?.proposedDates)
          .toHaveLength(5);
        expect(html)
          .toContain('>4 dates added<');
      });

      test('duplicate datetime + different venue → both exist', async () => {
        const session = sessionWithExistingDate();
        const app = editApp({
          params: {id: session.id},
          headers: {'HX-Request': 'true'},
          body: {
            generate: 'tuple',
            'time[]': ['8:00 pm'],
            venueNumber: '2',
            fromDate: FROM_TOKEN,
            toDate: TO_TOKEN_ANCHOR,
          },
        });
        await app.store.save(session);

        const html = await (await handleEditProposedDatesPost(app)).text();

        const stored = await app.store.get(session.id);
        // the same datetime at venue 2 is a distinct date, so all 5 weekdays
        // are added alongside the existing venue-1 date
        expect(stored?.proposedDates.filter((d) => d.dateTimeRange.start === existingDateIso))
          .toHaveLength(2);
        expect(stored?.proposedDates)
          .toHaveLength(6);
        expect(html)
          .toContain('>5 dates added<');
      });

      test('generator skipped count is venue-aware (same venue counts, different venue does not)', () => {
        // the handler only passes composite keys of existing dates at the form
        // venue, so venue-1 generation dedups against the existing venue-1 date
        const sameVenue = generateProposedDates({
          fromIso: '2026-08-25T08:00',
          toIso: '2026-09-30T16:00',
          todayIso: FIXED_TODAY_ISO,
          tuples: [{weekday: 1, hour: 20, minute: 0}],
          existingStarts: [`${existingDateIso}|1`],
        });
        expect(sameVenue.skipped)
          .toBe(1);
        expect(sameVenue.added)
          .not
          .toContain(existingDateIso);

        // venue-2 generation filters the venue-1 date out, so nothing is skipped
        const differentVenue = generateProposedDates({
          fromIso: '2026-08-25T08:00',
          toIso: '2026-09-30T16:00',
          todayIso: FIXED_TODAY_ISO,
          tuples: [{weekday: 1, hour: 20, minute: 0}],
          existingStarts: [],
        });
        expect(differentVenue.skipped)
          .toBe(0);
        expect(differentVenue.added)
          .toContain(existingDateIso);
      });
    });

    test('tuple branch: persists the expected count and renders a success toast with the count', async () => {
      const session = seedSession({
        originalMatchDateTime: '2026-09-02T16:00',
        proposedDates: [],
        status: 'Draft',
      });
      const app = editApp({
        params: {id: session.id},
        headers: {'HX-Request': 'true'},
        body: {
          generate: 'tuple',
          'time[]': ['8:00 pm'],
          fromDate: FROM_TOKEN,
          toDate: TO_TOKEN_ANCHOR,
        },
      });
      await app.store.save(session);

      const expected = generateProposedDates({
        fromIso: '2026-08-25T08:00',
        toIso: '2026-09-30T16:00',
        todayIso: FIXED_TODAY_ISO,
        tuples: [{weekday: 1, hour: 20, minute: 0}],
        existingStarts: [],
      });
      expect(expected.added.length)
        .toBeGreaterThan(0);

      const html = await (await handleEditProposedDatesPost(app)).text();

      const stored = await app.store.get(session.id);
      expect(stored?.proposedDates.map((d) => d.dateTimeRange.start))
        .toEqual(expected.added);
      expect(stored?.status)
        .toBe('Voting');
      expect(html)
        .toContain('id="proposed-dates-management"');
      expect(html)
        .toContain(`>${expected.added.length} dates added<`);
      // The generator outcome is announced via the shared OOB status element too.
      expect(html)
        .toContain(`<p id="clipboard-status" class="visually-hidden" role="status" hx-swap-oob="true">${expected.added.length} dates added</p>`);
      // US 14: the submitted time survives the success re-render.
      expect(html)
        .toContain('value="8:00 pm"');
    });

    test('tuple branch: empty rows are skipped at the parse boundary', async () => {
      const session = seedSession({
        originalMatchDateTime: '2026-09-02T16:00',
        proposedDates: [],
        status: 'Draft',
      });
      const app = editApp({
        params: {id: session.id},
        headers: {'HX-Request': 'true'},
        body: {
          generate: 'tuple',
          'time[]': ['8:00 pm', '', '9:00 pm'],
          fromDate: FROM_TOKEN,
          toDate: TO_TOKEN_ANCHOR,
        },
      });
      await app.store.save(session);

      // time[0] -> weekday 1 (Mon), time[2] -> weekday 3 (Wed); time[1] is empty.
      const expected = generateProposedDates({
        fromIso: '2026-08-25T08:00',
        toIso: '2026-09-30T23:59',
        todayIso: FIXED_TODAY_ISO,
        tuples: [
          {weekday: 1, hour: 20, minute: 0},
          {weekday: 3, hour: 21, minute: 0},
        ],
        existingStarts: [],
      });
      expect(expected.added.length)
        .toBeGreaterThan(0);

      const html = await (await handleEditProposedDatesPost(app)).text();

      const stored = await app.store.get(session.id);
      expect(stored?.proposedDates.map((d) => d.dateTimeRange.start))
        .toEqual(expected.added);
      expect(html)
        .toContain(`>${expected.added.length} dates added<`);
      expect(html)
        .toContain('value="8:00 pm"');
      expect(html)
        .toContain('value="9:00 pm"');
    });

    test('tuple branch: a row with a bad time returns 400 with a per-row error and preserves the other rows', async () => {
      const session = seedSession({originalMatchDateTime: '2026-09-02T16:00'});
      const app = editApp({
        params: {id: session.id},
        headers: {'HX-Request': 'true'},
        body: {
          generate: 'tuple',
          'time[]': ['8:00 pm', 'not-a-time', '9:00 pm'],
          fromDate: FROM_TOKEN,
          toDate: TO_TOKEN_ANCHOR,
        },
      });
      await app.store.save(session);

      const response = await handleEditProposedDatesPost(app);
      const html = await response.text();
      expect(response.status)
        .toBe(400);
      const stored = await app.store.get(session.id);
      expect(stored?.proposedDates)
        .toHaveLength(0);
      expect(stored?.originalMatchDateTime)
        .toBe('2026-09-02T16:00');
      // Row 1 is the offending row: marked invalid, linked to its inline error.
      expect(html)
        .toMatch(/id="time-1"[^>]*aria-invalid="true"/);
      expect(html)
        .toMatch(/id="time-1"[^>]*aria-describedby="time-1-error"/);
      expect(html)
        .toContain('id="time-1-error"');
      expect(html)
        .toContain('>Please provide a valid date and time</span>');
      // The other rows' submitted values round-trip through the partial.
      expect(html)
        .toContain('value="8:00 pm"');
      expect(html)
        .toContain('value="9:00 pm"');
      expect(html)
        .not
        .toMatch(/id="time-0"[^>]*aria-invalid/);
      expect(html)
        .not
        .toMatch(/id="time-2"[^>]*aria-invalid/);
    });

    test('tuple branch all-empty submit: no store write and the inline empty-result message', async () => {
      const session = seedSession({originalMatchDateTime: '2026-09-02T16:00'});
      const app = editApp({
        params: {id: session.id},
        headers: {'HX-Request': 'true'},
        body: {
          generate: 'tuple',
          'time[]': ['', '', '', '', '', '', ''],
          fromDate: FROM_TOKEN,
          toDate: TO_TOKEN_ANCHOR,
        },
      });
      await app.store.save(session);

      const before = await app.store.get(session.id);
      const html = await (await handleEditProposedDatesPost(app)).text();
      const after = await app.store.get(session.id);

      expect(before)
        .toEqual(after);
      expect(after?.proposedDates)
        .toHaveLength(0);
      expect(html)
        .toContain('No dates were added');
      expect(html)
        .not
        .toContain('dates added<');
    });

    test('tuple branch over-cap POST: 15 times are rejected at the handler seam rather than truncated', async () => {
      const session = seedSession({originalMatchDateTime: '2026-09-02T16:00'});
      const times = Array.from({length: 15}, (): string => '8:00 pm');
      const app = editApp({
        params: {id: session.id},
        headers: {'HX-Request': 'true'},
        body: {
          generate: 'tuple',
          'time[]': times,
          fromDate: FROM_TOKEN,
          toDate: TO_TOKEN_ANCHOR,
        },
      });
      await app.store.save(session);

      const response = await handleEditProposedDatesPost(app);
      const html = await response.text();
      expect(response.status)
        .toBe(400);
      const stored = await app.store.get(session.id);
      expect(stored?.proposedDates)
        .toHaveLength(0);
      expect(html)
        .toContain('Please provide a valid date and time');
    });

    test('tuple branch anchor missing: uses today-based window and shows success toast', async () => {
      const session = seedSession({
        status: 'Draft',
        proposedDates: [],
      });
      const app = editApp({
        params: {id: session.id},
        headers: {'HX-Request': 'true'},
        body: {
          generate: 'tuple',
          'time[]': ['8:00 pm'],
          fromDate: FROM_TOKEN,
          toDate: TO_TOKEN_TODAY,
        },
      });
      await app.store.save(session);

      const expected = generateProposedDates({
        fromIso: '2026-08-25T08:00',
        toIso: '2026-09-22T08:00',
        todayIso: FIXED_TODAY_ISO,
        tuples: [{weekday: 1, hour: 20, minute: 0}],
        existingStarts: [],
      });
      expect(expected.added.length)
        .toBeGreaterThan(0);

      const html = await (await handleEditProposedDatesPost(app)).text();

      const stored = await app.store.get(session.id);
      expect(stored?.proposedDates.map((d) => d.dateTimeRange.start))
        .toEqual(expected.added);
      expect(html)
        .toContain(`>${expected.added.length} dates added<`);
    });

    test('tuple branch zero-result path: no store write, renders the inline empty-result message', async () => {
      const session = seedSession({
        originalMatchDateTime: undefined,
      });
      const app = editApp({
        params: {id: session.id},
        headers: {'HX-Request': 'true'},
        body: {
          generate: 'tuple',
          'time[]': ['8:00 pm'],
          fromDate: FROM_TOKEN,
          toDate: '08/26/2026',
        },
      });
      await app.store.save(session);

      const before = await app.store.get(session.id);
      const html = await (await handleEditProposedDatesPost(app)).text();
      const after = await app.store.get(session.id);

      expect(before)
        .toEqual(after);
      expect(after?.proposedDates)
        .toHaveLength(0);
      expect(html)
        .toContain('No dates were added');
      expect(html)
        .not
        .toContain('dates added<');
    });

    test('tuple branch with an empty time[] array: inline empty-result message, no store write', async () => {
      const session = seedSession({originalMatchDateTime: '2026-09-02T16:00'});
      const app = editApp({
        params: {id: session.id},
        headers: {'HX-Request': 'true'},
        body: {
          generate: 'tuple',
          'time[]': [],
          fromDate: FROM_TOKEN,
          toDate: TO_TOKEN_ANCHOR,
        },
      });
      await app.store.save(session);

      const html = await (await handleEditProposedDatesPost(app)).text();

      const stored = await app.store.get(session.id);
      expect(stored?.proposedDates)
        .toHaveLength(0);
      expect(html)
        .toContain('No dates were added');
    });

    test('tuple branch empty From: required message on the From field, no Proposed Dates added', async () => {
      const session = seedSession({originalMatchDateTime: '2026-09-02T16:00', proposedDates: [], status: 'Draft'});
      const app = editApp({
        params: {id: session.id},
        headers: {'HX-Request': 'true'},
        body: {
          generate: 'tuple',
          'time[]': ['8:00 pm'],
          fromDate: '',
          toDate: TO_TOKEN_ANCHOR,
        },
      });
      await app.store.save(session);

      const response = await handleEditProposedDatesPost(app);
      const html = await response.text();
      expect(response.status)
        .toBe(400);
      const stored = await app.store.get(session.id);
      expect(stored?.proposedDates)
        .toHaveLength(0);
      expect(html)
        .toMatch(/id="fromDate"[^>]*aria-invalid="true"/);
      expect(html)
        .toMatch(/id="fromDate"[^>]*aria-describedby="fromDate-error"/);
      expect(html)
        .toContain('id="fromDate-error"');
      expect(html)
        .toContain('>Please enter a date</span>');
    });

    test('tuple branch empty To: required message on the To field, no Proposed Dates added', async () => {
      const session = seedSession({originalMatchDateTime: '2026-09-02T16:00', proposedDates: [], status: 'Draft'});
      const app = editApp({
        params: {id: session.id},
        headers: {'HX-Request': 'true'},
        body: {
          generate: 'tuple',
          'time[]': ['8:00 pm'],
          fromDate: FROM_TOKEN,
          toDate: '',
        },
      });
      await app.store.save(session);

      const response = await handleEditProposedDatesPost(app);
      const html = await response.text();
      expect(response.status)
        .toBe(400);
      const stored = await app.store.get(session.id);
      expect(stored?.proposedDates)
        .toHaveLength(0);
      expect(html)
        .toMatch(/id="toDate"[^>]*aria-invalid="true"/);
      expect(html)
        .toMatch(/id="toDate"[^>]*aria-describedby="toDate-error"/);
      expect(html)
        .toContain('id="toDate-error"');
      expect(html)
        .toContain('>Please enter a date</span>');
    });

    test('non-partial tuple submit: redirects to the edit page rather than rendering html', async () => {
      const session = seedSession({originalMatchDateTime: '2026-09-02T16:00'});
      const app = editApp({
        params: {id: session.id},
        body: {
          generate: 'tuple',
          'time[]': ['8:00 pm'],
          fromDate: FROM_TOKEN,
          toDate: TO_TOKEN_ANCHOR,
        },
      });
      await app.store.save(session);

      const response = await handleEditProposedDatesPost(app);

      expect(response.status)
        .toBe(302);
      expect(response.headers.get('location'))
        .toBe(`/edit/${session.id}`);
      const expected = generateProposedDates({
        fromIso: '2026-08-25T08:00',
        toIso: '2026-09-30T16:00',
        todayIso: FIXED_TODAY_ISO,
        tuples: [{weekday: 1, hour: 20, minute: 0}],
        existingStarts: [],
      });
      expect(expected.added.length)
        .toBeGreaterThan(0);
      const stored = await app.store.get(session.id);
      expect(stored?.proposedDates.map((d) => d.dateTimeRange.start))
        .toEqual(expected.added);
    });

    test('non-partial row-level invalid time: redirects rather than rendering html', async () => {
      const session = seedSession({originalMatchDateTime: '2026-09-02T16:00'});
      const app = editApp({
        params: {id: session.id},
        body: {
          generate: 'tuple',
          'time[]': ['not-a-time'],
          fromDate: FROM_TOKEN,
          toDate: TO_TOKEN_ANCHOR,
        },
      });
      await app.store.save(session);

      const response = await handleEditProposedDatesPost(app);

      expect(response.status)
        .toBe(302);
      const stored = await app.store.get(session.id);
      expect(stored?.proposedDates)
        .toHaveLength(0);
    });

    test('non-partial over-cap POST: redirects rather than rendering html', async () => {
      const session = seedSession({originalMatchDateTime: '2026-09-02T16:00'});
      const times = Array.from({length: 16}, (): string => '8:00 pm');
      const app = editApp({
        params: {id: session.id},
        body: {
          generate: 'tuple',
          'time[]': times,
          fromDate: FROM_TOKEN,
          toDate: TO_TOKEN_ANCHOR,
        },
      });
      await app.store.save(session);

      const response = await handleEditProposedDatesPost(app);

      expect(response.status)
        .toBe(302);
      const stored = await app.store.get(session.id);
      expect(stored?.proposedDates)
        .toHaveLength(0);
    });

    test('tuple branch with existing proposedDates: dedupes against existingStarts and adds the survivors', async () => {
      const existingDateIso = '2026-08-31T20:00';
      const session = seedSession({
        originalMatchDateTime: '2026-09-02T16:00',
        proposedDates: [
          aProposedDate({
            id: 'pd-existing',
            dateTimeRange: {start: existingDateIso, end: existingDateIso},
          }),
        ],
      });
      const app = editApp({
        params: {id: session.id},
        headers: {'HX-Request': 'true'},
        body: {
          generate: 'tuple',
          'time[]': ['8:00 pm'],
          fromDate: FROM_TOKEN,
          toDate: TO_TOKEN_ANCHOR,
        },
      });
      await app.store.save(session);

      const expected = generateProposedDates({
        fromIso: '2026-08-25T08:00',
        toIso: '2026-09-30T16:00',
        todayIso: FIXED_TODAY_ISO,
        tuples: [{weekday: 1, hour: 20, minute: 0}],
        existingStarts: [existingDateIso],
      });

      await handleEditProposedDatesPost(app);

      const stored = await app.store.get(session.id);
      expect(stored?.proposedDates.map((d) => d.dateTimeRange.start))
        .toEqual([existingDateIso, ...expected.added]);
      expect(stored?.proposedDates[0]?.id)
        .toBe('pd-existing');
    });

    test('tuple submit with a mismatched-bound-shape payload: 400 error (overrides default single-date fallthrough)', async () => {
      const session = seedSession({originalMatchDateTime: '2026-09-02T16:00'});
      const app = editApp({
        params: {id: session.id},
        headers: {'HX-Request': 'true'},
        body: {
          generate: 'tuple',
          // deliberately omit 'time[]'
        },
      });
      await app.store.save(session);

      const response = await handleEditProposedDatesPost(app);
      const html = await response.text();
      expect(response.status)
        .toBe(400);
      const stored = await app.store.get(session.id);
      expect(stored?.proposedDates)
        .toHaveLength(0);
      expect(html)
        .toContain('Please provide a valid date and time');
    });

    test('rogue POST combining tuple branch and proposedDateTime: rejected with 400, no store write', async () => {
      const session = seedSession({originalMatchDateTime: '2026-09-02T16:00', status: 'Draft'});
      const app = editApp({
        params: {id: session.id},
        headers: {'HX-Request': 'true'},
        body: {
          generate: 'tuple',
          'time[]': ['8:00 pm', '9:00 pm'],
          proposedDateTime: '09/05/2025 08:00 pm',
        },
      });
      await app.store.save(session);

      const response = await handleEditProposedDatesPost(app);
      const html = await response.text();
      expect(response.status)
        .toBe(400);
      const stored = await app.store.get(session.id);
      expect(stored?.proposedDates)
        .toHaveLength(0);
      expect(stored?.status)
        .toBe('Draft');
      expect(html)
        .toContain('Please provide a valid date and time');
    });

    describe('schedule clash check', () => {
      const identities = {
        home: {championship: 'MTTV 26/27', group: '219397', teamtable: '1732195'},
        away: {championship: 'MTTV 26/27', group: '219397', teamtable: '1732193'},
      };

      function clashSession(overrides: Parameters<typeof aSession>[0] = {}): Postponement {
        return seedSession({
          homeTeam: 'Home Team',
          guestTeam: 'Guest Team',
          homeTeamIdentity: identities.home,
          guestTeamIdentity: identities.away,
          ...overrides,
        });
      }

      test('single add: fetches each team\'s schedule once, attaches the clash data, saves once, and renders the clash line', async () => {
        const session = clashSession();
        mockFetchMatches.mockResolvedValue([
          {day: 'Mo', date: '01.09.2025', time: '19:00', homeTeam: 'Home Team', guestTeam: 'Guest Team'},
        ]);
        const app = editApp({
          params: {id: session.id},
          headers: {'HX-Request': 'true'},
          body: {proposedDateTime: '09/01/2025 08:00 pm'},
        });
        await app.store.save(session);
        const saveSpy = vi.spyOn(app.store, 'save');

        const html = await (await handleEditProposedDatesPost(app)).text();

        expect(mockFetchMatches)
          .toHaveBeenCalledTimes(2);
        expect(mockFetchMatches)
          .toHaveBeenCalledWith('MTTV 26/27', '219397', '1732195');
        expect(mockFetchMatches)
          .toHaveBeenCalledWith('MTTV 26/27', '219397', '1732193');
        const stored = await app.store.get(session.id);
        expect(stored?.proposedDates[0]?.clashes)
          .toEqual({
            home: [{opponent: 'Guest Team', start: '2025-09-01T19:00'}],
            away: [{opponent: 'Home Team', start: '2025-09-01T19:00'}],
          });
        expect(saveSpy)
          .toHaveBeenCalledTimes(1);
        expect(html)
          .toContain('Home: 7:00 PM vs Guest Team');
        expect(html)
          .toContain('Away: 7:00 PM vs Home Team');
      });

      test('generator run: fetches once per team, attaches the clash data to every added date, and saves once', async () => {
        const session = clashSession();
        session.originalMatchDateTime = '2026-09-02T16:00';
        session.proposedDates = [];
        session.status = 'Draft';
        const expected = generateProposedDates({
          fromIso: '2026-08-25T08:00',
          toIso: '2026-09-30T16:00',
          todayIso: FIXED_TODAY_ISO,
          tuples: [{weekday: 1, hour: 20, minute: 0}],
          existingStarts: [],
        });
        expect(expected.added.length)
          .toBeGreaterThan(0);
        const addedStart = expected.added[0];
        if (addedStart === undefined) {
          throw new Error('generator produced no dates');
        }
        mockFetchMatches.mockResolvedValue(expected.added.map((start) => {
          const [gameYear, gameMonth, gameDay] = start.split('T')[0]?.split('-') ?? [];
          const gameStartTime = start.split('T')[1]?.slice(0, 5);
          return {
            day: 'Mo',
            date: `${gameDay}.${gameMonth}.${gameYear}`,
            time: gameStartTime ?? '',
            homeTeam: 'Home Team',
            guestTeam: 'Guest Team',
          };
        }));
        const app = editApp({
          params: {id: session.id},
          headers: {'HX-Request': 'true'},
          body: {generate: 'tuple', 'time[]': ['8:00 pm'], fromDate: FROM_TOKEN, toDate: TO_TOKEN_ANCHOR},
        });
        await app.store.save(session);
        const saveSpy = vi.spyOn(app.store, 'save');

        await handleEditProposedDatesPost(app);

        expect(mockFetchMatches)
          .toHaveBeenCalledTimes(2);
        const stored = await app.store.get(session.id);
        expect(stored?.proposedDates.map((pd) => pd.clashes))
          .toEqual(expected.added.map((start) => ({
            home: [{opponent: 'Guest Team', start}],
            away: [{opponent: 'Home Team', start}],
          })));
        expect(saveSpy)
          .toHaveBeenCalledTimes(1);
      });

      test('single add: a newly added clashing date is auto-deselected but still persisted with its clash data', async () => {
        const session = clashSession();
        mockFetchMatches.mockResolvedValue([
          {day: 'Mo', date: '01.09.2025', time: '19:00', homeTeam: 'Home Team', guestTeam: 'Guest Team'},
        ]);
        const app = editApp({
          params: {id: session.id},
          headers: {'HX-Request': 'true'},
          body: {proposedDateTime: '09/01/2025 08:00 pm'},
        });
        await app.store.save(session);

        await handleEditProposedDatesPost(app);

        const stored = await app.store.get(session.id);
        expect(stored?.proposedDates)
          .toHaveLength(1);
        expect(stored?.proposedDates[0]?.votable)
          .toBe(false);
        expect(stored?.proposedDates[0]?.clashes)
          .toEqual({
            home: [{opponent: 'Guest Team', start: '2025-09-01T19:00'}],
            away: [{opponent: 'Home Team', start: '2025-09-01T19:00'}],
          });
      });

      test('single add: a clean date stays votable', async () => {
        const session = clashSession();
        mockFetchMatches.mockResolvedValue([
          {day: 'Fr', date: '05.09.2025', time: '10:00', homeTeam: 'Some Team', guestTeam: 'Other Team'},
        ]);
        const app = editApp({
          params: {id: session.id},
          headers: {'HX-Request': 'true'},
          body: {proposedDateTime: '09/01/2025 08:00 pm'},
        });
        await app.store.save(session);

        await handleEditProposedDatesPost(app);

        const stored = await app.store.get(session.id);
        expect(stored?.proposedDates)
          .toHaveLength(1);
        expect(stored?.proposedDates[0]?.votable)
          .toBe(true);
        expect(stored?.proposedDates[0]?.clashes)
          .toEqual({home: [], away: []});
      });

      test('generator run: only the newly generated dates that clash are auto-deselected', async () => {
        const session = clashSession();
        session.originalMatchDateTime = '2026-09-02T16:00';
        session.proposedDates = [];
        session.status = 'Draft';
        const expected = generateProposedDates({
          fromIso: '2026-08-25T08:00',
          toIso: '2026-09-30T16:00',
          todayIso: FIXED_TODAY_ISO,
          tuples: [
            {weekday: 1, hour: 20, minute: 0},
            {weekday: 2, hour: 20, minute: 0},
          ],
          existingStarts: [],
        });
        expect(expected.added.length)
          .toBeGreaterThan(1);
        const clashStart = expected.added[0];
        if (clashStart === undefined) {
          throw new Error('generator produced no dates');
        }
        const [gameYear, gameMonth, gameDay] = clashStart.split('T')[0]?.split('-') ?? [];
        const gameStartTime = clashStart.split('T')[1]?.slice(0, 5);
        mockFetchMatches.mockResolvedValue([
          {
            day: 'Mo',
            date: `${gameDay}.${gameMonth}.${gameYear}`,
            time: gameStartTime ?? '',
            homeTeam: 'Home Team',
            guestTeam: 'Guest Team',
          },
        ]);
        const app = editApp({
          params: {id: session.id},
          headers: {'HX-Request': 'true'},
          body: {generate: 'tuple', 'time[]': ['8:00 pm', '8:00 pm'], fromDate: FROM_TOKEN, toDate: TO_TOKEN_ANCHOR},
        });
        await app.store.save(session);

        await handleEditProposedDatesPost(app);

        const stored = await app.store.get(session.id);
        expect(stored?.proposedDates
          .map((pd) => pd.votable))
          .toEqual(expected.added.map((start) => start !== clashStart));
      });

      test('a later proposal leaves pre-existing dates\' votable untouched (including a manual flip)', async () => {
        const session = clashSession({
          status: 'Voting',
          proposedDates: [
            aProposedDate({
              id: 'pd-open',
              dateTimeRange: {start: '2025-09-10T20:00', end: '2025-09-10T20:00'},
              votable: true,
            }),
            aProposedDate({
              id: 'pd-flipped',
              dateTimeRange: {start: '2025-09-11T20:00', end: '2025-09-11T20:00'},
              votable: false,
            }),
          ],
        });
        mockFetchMatches.mockResolvedValue([
          {day: 'Mo', date: '01.09.2025', time: '19:00', homeTeam: 'Home Team', guestTeam: 'Guest Team'},
        ]);
        const app = editApp({
          params: {id: session.id},
          headers: {'HX-Request': 'true'},
          body: {proposedDateTime: '09/01/2025 08:00 pm'},
        });
        await app.store.save(session);

        await handleEditProposedDatesPost(app);

        const stored = await app.store.get(session.id);
        expect(stored?.proposedDates)
          .toHaveLength(3);
        expect(stored?.proposedDates.find((pd) => pd.id === 'pd-open')?.votable)
          .toBe(true);
        expect(stored?.proposedDates.find((pd) => pd.id === 'pd-flipped')?.votable)
          .toBe(false);
        const added = stored?.proposedDates.find((pd) => pd.id !== 'pd-open' && pd.id !== 'pd-flipped');
        expect(added?.votable)
          .toBe(false);
      });

      test('single add: a failed scrape leaves the date clash-free, votable, still saves and renders', async () => {
        const session = clashSession();
        mockFetchMatches.mockRejectedValue(new ClickTTError('click-tt is down'));
        const app = editApp({
          params: {id: session.id},
          headers: {'HX-Request': 'true'},
          body: {proposedDateTime: '09/01/2025 08:00 pm'},
        });
        await app.store.save(session);
        const saveSpy = vi.spyOn(app.store, 'save');

        const html = await (await handleEditProposedDatesPost(app)).text();

        const stored = await app.store.get(session.id);
        expect(stored?.proposedDates)
          .toHaveLength(1);
        expect(stored?.proposedDates[0]?.clashes)
          .toBeUndefined();
        expect(stored?.proposedDates[0]?.votable)
          .toBe(true);
        expect(saveSpy)
          .toHaveBeenCalledTimes(1);
        expect(html)
          .toContain('id="proposed-dates-management"');
        expect(html)
          .not
          .toContain('Not checked');
      });

      test('single add: a transient scrape failure marks the clash data stale', async () => {
        const session = clashSession();
        mockFetchMatches.mockRejectedValue(new ClickTTError('click-tt is down'));
        const app = editApp({
          params: {id: session.id},
          headers: {'HX-Request': 'true'},
          body: {proposedDateTime: '09/01/2025 08:00 pm'},
        });
        await app.store.save(session);

        const html = await (await handleEditProposedDatesPost(app)).text();

        const stored = await app.store.get(session.id);
        expect(stored?.clashDataStale)
          .toBe(true);
        expect(stored?.proposedDates[0]?.clashes)
          .toBeUndefined();
        expect(html)
          .toContain('without clash data');
      });

      test('single add: a successful check clears a previous stale flag', async () => {
        const session = clashSession({clashDataStale: true});
        mockFetchMatches.mockResolvedValue([
          {day: 'Mo', date: '01.09.2025', time: '19:00', homeTeam: 'Home Team', guestTeam: 'Guest Team'},
        ]);
        const app = editApp({
          params: {id: session.id},
          headers: {'HX-Request': 'true'},
          body: {proposedDateTime: '09/01/2025 08:00 pm'},
        });
        await app.store.save(session);

        const html = await (await handleEditProposedDatesPost(app)).text();

        const stored = await app.store.get(session.id);
        expect(stored?.clashDataStale)
          .toBeUndefined();
        expect(html)
          .not
          .toContain('without clash data');
      });

      test('generator run: a failed scrape still saves the generated dates without clash data', async () => {
        const session = clashSession();
        session.originalMatchDateTime = '2026-09-02T16:00';
        session.proposedDates = [];
        session.status = 'Draft';
        mockFetchMatches.mockRejectedValue(new Error('network down'));
        const app = editApp({
          params: {id: session.id},
          headers: {'HX-Request': 'true'},
          body: {generate: 'tuple', 'time[]': ['8:00 pm'], fromDate: FROM_TOKEN, toDate: TO_TOKEN_ANCHOR},
        });
        await app.store.save(session);
        const saveSpy = vi.spyOn(app.store, 'save');

        await handleEditProposedDatesPost(app);

        const stored = await app.store.get(session.id);
        expect(stored?.proposedDates.length)
          .toBeGreaterThan(0);
        expect(stored?.proposedDates.every((pd) => pd.clashes === undefined))
          .toBe(true);
        expect(saveSpy)
          .toHaveBeenCalledTimes(1);
      });

      test('hand-entered session: never fetches and renders the "not checked" hint', async () => {
        const session = seedSession();
        const app = editApp({
          params: {id: session.id},
          headers: {'HX-Request': 'true'},
          body: {proposedDateTime: '09/01/2025 08:00 pm'},
        });
        await app.store.save(session);

        const html = await (await handleEditProposedDatesPost(app)).text();

        expect(mockFetchMatches)
          .not
          .toHaveBeenCalled();
        const stored = await app.store.get(session.id);
        expect(stored?.proposedDates[0]?.clashes)
          .toBeUndefined();
        expect(stored?.proposedDates[0]?.votable)
          .toBe(true);
        expect(html)
          .toContain('Not checked');
      });

      describe('venue occupancy', () => {
        function occupancySession(overrides: Parameters<typeof aSession>[0] = {}): Postponement {
          return clashSession({clubId: '33282', ...overrides});
        }

        test('single add: fetches the home club\'s meetings in the same pass and attaches the occupancy snapshot', async () => {
          const session = occupancySession();
          mockFetchMatches.mockResolvedValue([]);
          mockFetchClubMeetings.mockResolvedValue([
            {
              day: 'Di',
              date: '01.09.2025',
              time: '19:30',
              homeTeam: 'Ostermundigen',
              guestTeam: 'Köniz II',
              venueNumber: 1,
            },
          ]);
          const app = editApp({
            params: {id: session.id},
            headers: {'HX-Request': 'true'},
            body: {proposedDateTime: '09/01/2025 08:00 pm'},
          });
          await app.store.save(session);

          const html = await (await handleEditProposedDatesPost(app)).text();

          // The occupancy fetch runs in parallel with the two team fetches,
          // deriving its season window from the home team's championship.
          expect(mockFetchClubMeetings)
            .toHaveBeenCalledTimes(1);
          expect(mockFetchClubMeetings)
            .toHaveBeenCalledWith('33282', '01.07.2026', '30.06.2027');
          const stored = await app.store.get(session.id);
          expect(stored?.proposedDates)
            .toHaveLength(1);
          expect(stored?.proposedDates[0]?.venueOccupancy)
            .toEqual({
              count: 1,
              matches: [{opponent: 'Köniz II', start: '2025-09-01T19:30'}],
            });
          // The clash snapshot still attaches in the same pass.
          expect(stored?.proposedDates[0]?.clashes)
            .toEqual({home: [], away: []});
          expect(html)
            .toContain('1 other game at this venue');
        });

        test('single add: a failed occupancy scrape still saves the date and still attaches the clash snapshot', async () => {
          const session = occupancySession();
          mockFetchMatches.mockResolvedValue([
            {day: 'Mo', date: '01.09.2025', time: '19:00', homeTeam: 'Home Team', guestTeam: 'Guest Team'},
          ]);
          mockFetchClubMeetings.mockRejectedValue(new ClickTTError('click-tt is down'));
          const app = editApp({
            params: {id: session.id},
            headers: {'HX-Request': 'true'},
            body: {proposedDateTime: '09/01/2025 08:00 pm'},
          });
          await app.store.save(session);
          const saveSpy = vi.spyOn(app.store, 'save');

          await handleEditProposedDatesPost(app);

          const stored = await app.store.get(session.id);
          expect(stored?.proposedDates)
            .toHaveLength(1);
          expect(stored?.proposedDates[0]?.venueOccupancy)
            .toBeUndefined();
          expect(stored?.proposedDates[0]?.clashes)
            .toEqual({
              home: [{opponent: 'Guest Team', start: '2025-09-01T19:00'}],
              away: [{opponent: 'Home Team', start: '2025-09-01T19:00'}],
            });
          expect(saveSpy)
            .toHaveBeenCalledTimes(1);
        });

        test('a club-id-less session (DEFAULT_CLUB_ID placeholder) never fires the occupancy fetch', async () => {
          const session = clashSession({clubId: 'default-club'});
          mockFetchMatches.mockResolvedValue([]);
          const app = editApp({
            params: {id: session.id},
            headers: {'HX-Request': 'true'},
            body: {proposedDateTime: '09/01/2025 08:00 pm'},
          });
          await app.store.save(session);

          const html = await (await handleEditProposedDatesPost(app)).text();

          expect(mockFetchClubMeetings)
            .not
            .toHaveBeenCalled();
          const stored = await app.store.get(session.id);
          expect(stored?.proposedDates[0]?.venueOccupancy)
            .toBeUndefined();
          // clashes still attach: the session has team identities
          expect(stored?.proposedDates[0]?.clashes)
            .toEqual({home: [], away: []});
          expect(html)
            .not
            .toContain('other games at this venue');
        });

        test('a clean occupancy (zero count) renders the clean line, not the count', async () => {
          const session = occupancySession();
          mockFetchMatches.mockResolvedValue([]);
          mockFetchClubMeetings.mockResolvedValue([
            {
              day: 'Fr',
              date: '05.09.2025',
              time: '10:00',
              homeTeam: 'Ostermundigen',
              guestTeam: 'Bern',
              venueNumber: 1,
            },
          ]);
          const app = editApp({
            params: {id: session.id},
            headers: {'HX-Request': 'true'},
            body: {proposedDateTime: '09/01/2025 08:00 pm'},
          });
          await app.store.save(session);

          const html = await (await handleEditProposedDatesPost(app)).text();

          const stored = await app.store.get(session.id);
          expect(stored?.proposedDates[0]?.venueOccupancy)
            .toEqual({count: 0, matches: []});
          expect(html)
            .toContain('Venue empty');
          expect(html)
            .not
            .toContain('other games at this venue');
        });

        test('a home championship without a season window skips the occupancy fetch, clashes still attach', async () => {
          const session = occupancySession({homeTeamIdentity: {...identities.home, championship: 'Sommerliga'}});
          mockFetchMatches.mockResolvedValue([]);
          const app = editApp({
            params: {id: session.id},
            headers: {'HX-Request': 'true'},
            body: {proposedDateTime: '09/01/2025 08:00 pm'},
          });
          await app.store.save(session);

          const html = await (await handleEditProposedDatesPost(app)).text();

          expect(mockFetchClubMeetings)
            .not
            .toHaveBeenCalled();
          const stored = await app.store.get(session.id);
          expect(stored?.proposedDates[0]?.venueOccupancy)
            .toBeUndefined();
          expect(stored?.proposedDates[0]?.clashes)
            .toEqual({home: [], away: []});
          expect(html)
            .not
            .toContain('other games at this venue');
        });
      });
    });
  });

  test('non-partial tuple submit with malformed body: redirects rather than rendering html', async () => {
    const session = seedSession({originalMatchDateTime: '2026-09-02T16:00'});
    const app = editApp({
      params: {id: session.id},
      body: {
        generate: 'tuple',
        // deliberately omit 'time[]'
      },
    });
    await app.store.save(session);

    const response = await handleEditProposedDatesPost(app);

    expect(response.status)
      .toBe(302);
    const stored = await app.store.get(session.id);
    expect(stored?.proposedDates)
      .toHaveLength(0);
  });

  describe('generator date-window validation', () => {
    function windowSession(overrides: Parameters<typeof aSession>[0] = {}): Postponement {
      return seedSession({originalMatchDateTime: '2026-09-02T16:00', proposedDates: [], status: 'Draft', ...overrides});
    }

    test('fromDate before today: redraws the partial with the from-field error, no write', async () => {
      const session = windowSession();
      const app = editApp({
        params: {id: session.id},
        headers: {'HX-Request': 'true'},
        body: {generate: 'tuple', 'time[]': ['8:00 pm'], fromDate: '08/01/2026', toDate: '09/15/2026'},
      });
      await app.store.save(session);

      const response = await handleEditProposedDatesPost(app);
      const html = await response.text();

      expect(html)
        .toContain('Date must be today or later');
      expect(html)
        .toMatch(/id="fromDate"[^>]*aria-invalid="true"/);
      const stored = await app.store.get(session.id);
      expect(stored?.proposedDates)
        .toHaveLength(0);
    });

    test('toDate on or before fromDate: redraws the partial with the to-field error', async () => {
      const session = windowSession();
      const app = editApp({
        params: {id: session.id},
        headers: {'HX-Request': 'true'},
        body: {generate: 'tuple', 'time[]': ['8:00 pm'], fromDate: '09/01/2026', toDate: '09/01/2026'},
      });
      await app.store.save(session);

      const response = await handleEditProposedDatesPost(app);
      const html = await response.text();

      expect(html)
        .toContain('Date must be after &#39;From&#39; and at most 4 weeks after the original match');
      expect(html)
        .toMatch(/id="toDate"[^>]*aria-invalid="true"/);
    });

    test('toDate beyond the anchor-based cap: redraws the partial with the to-field error', async () => {
      const session = windowSession();
      const app = editApp({
        params: {id: session.id},
        headers: {'HX-Request': 'true'},
        body: {generate: 'tuple', 'time[]': ['8:00 pm'], fromDate: '09/01/2026', toDate: '10/15/2026'},
      });
      await app.store.save(session);

      const response = await handleEditProposedDatesPost(app);
      const html = await response.text();

      expect(html)
        .toContain('Date must be after &#39;From&#39; and at most 4 weeks after the original match');
    });

    test('toDate beyond the today-based cap without an anchor: redraws with the no-anchor to-field error', async () => {
      const session = windowSession({originalMatchDateTime: undefined});
      const app = editApp({
        params: {id: session.id},
        headers: {'HX-Request': 'true'},
        body: {generate: 'tuple', 'time[]': ['8:00 pm'], fromDate: '09/01/2026', toDate: '10/15/2026'},
      });
      await app.store.save(session);

      const response = await handleEditProposedDatesPost(app);
      const html = await response.text();

      expect(html)
        .toContain('Date must be after &#39;From&#39; and at most 4 weeks from today');
    });

    test('non-partial fromDate-before-today tuple submit: redirects via the render-partial seam', async () => {
      const session = windowSession();
      const app = editApp({
        params: {id: session.id},
        body: {generate: 'tuple', 'time[]': ['8:00 pm'], fromDate: '08/01/2026', toDate: '09/15/2026'},
      });
      await app.store.save(session);

      const response = await handleEditProposedDatesPost(app);

      expect(response.status)
        .toBe(302);
      expect(response.headers.get('location'))
        .toBe(`/edit/${session.id}`);
    });
  });

  describe('partial (HX-Request) fragment rendering', () => {
    const partialHeaders = {'HX-Request': 'true'};

    test('players: renders the team section with an empty error-container on success', async () => {
      const session = seedSession();
      const app = editApp({
        params: {id: session.id},
        headers: partialHeaders,
        body: {playerName: 'Alice'},
      });
      await app.store.save(session);

      const html = await (await handleEditPlayersPost(app)).text();

      expect(html)
        .toContain('<div id="team-management"');
      expect(html)
        .toContain('Alice');
      expect(html)
        .toContain('id="error-container" hx-swap-oob="true"');
      // No proposed dates → no vote-dots rail is rendered.
      expect(html)
        .not
        .toContain('class="vote-dots"');
      expect(html)
        .not
        .toContain('error padding white-text');
      expect(html)
        .not
        .toContain('Your Team Votes');
      // The success outcome is announced once via the shared OOB status element.
      expect(html)
        .toContain('<p id="clipboard-status" class="visually-hidden" role="status" hx-swap-oob="true">Player added</p>');
    });

    test('players: renders the error-container and keeps the invalid input on failure', async () => {
      const session = seedSession();
      const app = editApp({params: {id: session.id}, headers: partialHeaders, body: {playerName: ''}});
      await app.store.save(session);

      const response = await handleEditPlayersPost(app);
      const html = await response.text();
      expect(response.status)
        .toBe(400);
      expect(html)
        .toContain('id="error-container" hx-swap-oob="true"');
      expect(html)
        .toContain('Player name is required');
      expect(html)
        .toContain('invalid');
      // Errors stay in the error container; the status element is not touched.
      expect(html)
        .not
        .toContain('id="clipboard-status"');
    });

    test('players: a missing player name is rendered as an empty field on a partial failure', async () => {
      const session = seedSession();
      const app = editApp({params: {id: session.id}, headers: partialHeaders, body: {}});
      await app.store.save(session);

      const response = await handleEditPlayersPost(app);
      const html = await response.text();
      expect(response.status)
        .toBe(400);
      expect(html)
        .toContain('id="error-container" hx-swap-oob="true"');
      expect(html)
        .toContain('id="playerName-error"');
      expect(html)
        .toContain('id="playerName" name="playerName" value=""');
    });

    test('proposed dates: renders the section and a success toast on success', async () => {
      const session = seedSession();
      const app = editApp({
        params: {id: session.id},
        headers: partialHeaders,
        body: {proposedDateTime: '09/01/2025 08:00 pm'},
      });
      await app.store.save(session);

      const html = await (await handleEditProposedDatesPost(app)).text();

      expect(html)
        .toContain('<section id="proposed-dates-management"');
      expect(html)
        .toContain('toast success');
      expect(html)
        .toContain('class="vote-dots"');
      // The success outcome is announced once via the shared OOB status element.
      expect(html)
        .toContain('<p id="clipboard-status" class="visually-hidden" role="status" hx-swap-oob="true">Proposed date added!</p>');
      // The re-rendered generator keeps a populated (never empty) From/To
      // range formatted as locale tokens — today and today+4w for an anchorless
      // session under the fixed test clock.
      expect(html)
        .toContain('id="fromDate" type="text" name="fromDate" value="08/25/2026"');
      expect(html)
        .toContain('id="toDate" type="text" name="toDate" value="09/22/2026"');
    });

    test('proposed dates: renders the error-container on an invalid datetime', async () => {
      const session = seedSession();
      const app = editApp({
        params: {id: session.id},
        headers: partialHeaders,
        body: {proposedDateTime: 'not-a-date'},
      });
      await app.store.save(session);

      const response = await handleEditProposedDatesPost(app);
      const html = await response.text();
      expect(response.status)
        .toBe(400);
      expect(html)
        .toContain('id="error-container" hx-swap-oob="true"');
      expect(html)
        .toContain('invalid');
      expect(html)
        .toContain('id="fromDate" type="text" name="fromDate" value="08/25/2026"');
      expect(html)
        .toContain('id="toDate" type="text" name="toDate" value="09/22/2026"');
      // Errors stay in the error container; the status element is not touched.
      expect(html)
        .not
        .toContain('id="clipboard-status"');
    });
  });

  describe('handleConfirmDatePost', () => {
    test('confirms a votable date and locks the session', async () => {
      const session = seedSession({
        status: 'Voting',
        proposedDates: [aProposedDate({id: 'pd-1', votable: true, accepted: true})],
      });
      const app = editApp({params: {id: session.id}, queries: {proposedDateId: 'pd-1'}});
      await app.store.save(session);

      await handleConfirmDatePost(app);

      const stored = await app.store.get(session.id);
      expect(stored?.status)
        .toBe('Confirmed');
      expect(stored?.confirmedProposedDateId)
        .toBe('pd-1');
    });

    test('is a no-op for a date that is not votable', async () => {
      const session = seedSession({
        status: 'Voting',
        proposedDates: [aProposedDate({id: 'pd-1', votable: false})],
      });
      const app = editApp({params: {id: session.id}, queries: {proposedDateId: 'pd-1'}});
      await app.store.save(session);

      await handleConfirmDatePost(app);

      const stored = await app.store.get(session.id);
      expect(stored?.status)
        .toBe('Voting');
      expect(stored?.confirmedProposedDateId)
        .toBeUndefined();
    });

    test('is idempotent: confirming the same date again keeps the locked state', async () => {
      const session = seedSession({
        status: 'Confirmed',
        confirmedProposedDateId: 'pd-1',
        proposedDates: [aProposedDate({id: 'pd-1', votable: true, accepted: true})],
      });
      const app = editApp({params: {id: session.id}, queries: {proposedDateId: 'pd-1'}});
      await app.store.save(session);

      await handleConfirmDatePost(app);

      const stored = await app.store.get(session.id);
      expect(stored?.status)
        .toBe('Confirmed');
      expect(stored?.confirmedProposedDateId)
        .toBe('pd-1');
    });

    test('confirming a clashing date renders the inline warning and moves to Confirmed', async () => {
      const session = seedSession({
        status: 'Voting',
        proposedDates: [
          aProposedDate({
            id: 'pd-1',
            votable: true,
            accepted: true,
            clashes: {home: [{opponent: 'Thun', start: '2025-09-01T18:00'}], away: []},
          }),
        ],
      });
      const app = editApp({
        params: {id: session.id},
        queries: {proposedDateId: 'pd-1'},
        headers: {'HX-Request': 'true'},
      });
      await app.store.save(session);

      const html = await (await handleConfirmDatePost(app)).text();

      const stored = await app.store.get(session.id);
      expect(stored?.status)
        .toBe('Confirmed');
      expect(stored?.confirmedProposedDateId)
        .toBe('pd-1');
      expect(html)
        .toContain('A scheduled game clashes with this date.');
      // The clash warning is the single polite status announcement; the plain
      // confirmation is not also announced.
      expect(html)
        .toContain('<p id="clipboard-status" class="visually-hidden" role="status" hx-swap-oob="true">A scheduled game clashes with this date.</p>');
      expect(html)
        .not
        .toContain('<p id="clipboard-status" class="visually-hidden" role="status" hx-swap-oob="true">Date confirmed</p>');
    });

    test('confirming a clash-free date renders no warning', async () => {
      const session = seedSession({
        status: 'Voting',
        proposedDates: [
          aProposedDate({
            id: 'pd-1',
            votable: true,
            accepted: true,
            clashes: {home: [], away: []},
          }),
        ],
      });
      const app = editApp({
        params: {id: session.id},
        queries: {proposedDateId: 'pd-1'},
        headers: {'HX-Request': 'true'},
      });
      await app.store.save(session);

      const html = await (await handleConfirmDatePost(app)).text();

      expect(html)
        .not
        .toContain('A scheduled game clashes with this date.');
      expect(html)
        .toContain('<p id="clipboard-status" class="visually-hidden" role="status" hx-swap-oob="true">Date confirmed</p>');
    });

    test('judges the warning from the date found via confirmedProposedDateId, not the query', async () => {
      const session = seedSession({
        status: 'Voting',
        proposedDates: [
          aProposedDate({
            id: 'pd-clashing',
            votable: true,
            accepted: true,
            clashes: {home: [{opponent: 'Thun', start: '2025-09-01T18:00'}], away: []},
          }),
          aProposedDate({
            id: 'pd-clean',
            votable: true,
            accepted: true,
            clashes: {home: [], away: []},
          }),
        ],
      });
      const app = editApp({
        params: {id: session.id},
        queries: {proposedDateId: 'pd-clean'},
        headers: {'HX-Request': 'true'},
      });
      await app.store.save(session);

      const html = await (await handleConfirmDatePost(app)).text();

      const stored = await app.store.get(session.id);
      expect(stored?.confirmedProposedDateId)
        .toBe('pd-clean');
      expect(html)
        .not
        .toContain('A scheduled game clashes with this date.');
    });

    test('renders the partial with the reopen control and no confirm control when partial', async () => {
      const session = seedSession({
        status: 'Voting',
        proposedDates: [aProposedDate({id: 'pd-1', votable: true, accepted: true})],
      });
      const app = editApp({
        params: {id: session.id},
        queries: {proposedDateId: 'pd-1'},
        headers: {'HX-Request': 'true'},
      });
      await app.store.save(session);

      const html = await (await handleConfirmDatePost(app)).text();

      expect(html)
        .toContain('<section id="proposed-dates-management"');
      expect(html)
        .toContain(`hx-post="/edit/${session.id}/reopen?organizerPassword=${ORGANIZER_PASSWORD}"`);
      expect(html)
        .not
        .toContain('proposed-date-confirm');
      expect(html)
        .toContain('id="status-chip"');
      expect(html)
        .toContain('class="vote-dots"');
      // The confirmed outcome is announced via the shared OOB status element.
      expect(html)
        .toContain('<p id="clipboard-status" class="visually-hidden" role="status" hx-swap-oob="true">Date confirmed</p>');
    });

    test('confirming with a missing proposedDateId is a no-op (no save, voting stays unlocked)', async () => {
      const session = seedSession({
        status: 'Voting',
        proposedDates: [aProposedDate({id: 'pd-1', votable: true})],
      });
      const app = editApp({params: {id: session.id}, headers: {'HX-Request': 'true'}});
      await app.store.save(session);
      const saveSpy = vi.spyOn(app.store, 'save');

      const html = await (await handleConfirmDatePost(app)).text();

      const stored = await app.store.get(session.id);
      expect(stored?.status)
        .toBe('Voting');
      expect(stored?.confirmedProposedDateId)
        .toBeUndefined();
      expect(saveSpy)
        .not
        .toHaveBeenCalled();
      expect(html)
        .toContain('<p id="clipboard-status" class="visually-hidden" role="status" hx-swap-oob="true">Only dates the opponent has accepted and that are still votable can be confirmed.</p>');
    });

    test('is a no-op for a date that is not accepted and announces the feedback', async () => {
      const session = seedSession({
        status: 'Voting',
        proposedDates: [aProposedDate({id: 'pd-1', votable: true, accepted: false})],
      });
      const app = editApp({
        params: {id: session.id},
        queries: {proposedDateId: 'pd-1'},
        headers: {'HX-Request': 'true'},
      });
      await app.store.save(session);
      const saveSpy = vi.spyOn(app.store, 'save');

      const html = await (await handleConfirmDatePost(app)).text();

      const stored = await app.store.get(session.id);
      expect(stored?.status)
        .toBe('Voting');
      expect(stored?.confirmedProposedDateId)
        .toBeUndefined();
      expect(saveSpy)
        .not
        .toHaveBeenCalled();
      expect(html)
        .toContain('<p id="clipboard-status" class="visually-hidden" role="status" hx-swap-oob="true">Only dates the opponent has accepted and that are still votable can be confirmed.</p>');
      expect(html)
        .not
        .toContain('Date confirmed');
    });

    test('is a no-op for a date the opponent made non-votable and announces the feedback', async () => {
      const session = seedSession({
        status: 'Voting',
        proposedDates: [aProposedDate({id: 'pd-1', votable: true, accepted: true, opponentVotable: false})],
      });
      const app = editApp({
        params: {id: session.id},
        queries: {proposedDateId: 'pd-1'},
        headers: {'HX-Request': 'true'},
      });
      await app.store.save(session);

      const html = await (await handleConfirmDatePost(app)).text();

      const stored = await app.store.get(session.id);
      expect(stored?.status)
        .toBe('Voting');
      expect(stored?.confirmedProposedDateId)
        .toBeUndefined();
      expect(html)
        .toContain('<p id="clipboard-status" class="visually-hidden" role="status" hx-swap-oob="true">Only dates the opponent has accepted and that are still votable can be confirmed.</p>');
    });
  });

  describe('handleProposedDateDeletePost', () => {
    test('removes the date and its votes', async () => {
      const session = seedSession({
        status: 'Voting',
        proposedDates: [
          aProposedDate({id: 'pd-1'}),
          aProposedDate({id: 'pd-2'}),
        ],
        votes: [aVote({proposedDateId: 'pd-1', participantId: 'player-1', type: 'Yes'})],
      });
      const app = editApp({params: {id: session.id}, queries: {proposedDateId: 'pd-1'}});
      await app.store.save(session);

      await handleProposedDateDeletePost(app);

      const stored = await app.store.get(session.id);
      expect(stored?.proposedDates.map((pd) => pd.id))
        .toEqual(['pd-2']);
      expect(stored?.votes)
        .toHaveLength(0);
    });

    test('renders the partial with the remaining date-management controls when partial', async () => {
      const session = seedSession({
        status: 'Voting',
        proposedDates: [
          aProposedDate({id: 'pd-1', votable: true}),
          aProposedDate({id: 'pd-2', votable: false}),
        ],
      });
      const app = editApp({
        params: {id: session.id},
        queries: {proposedDateId: 'pd-1'},
        headers: {'HX-Request': 'true'},
      });
      await app.store.save(session);

      const html = await (await handleProposedDateDeletePost(app)).text();

      expect(html)
        .toContain('<section id="proposed-dates-management"');
      expect(html)
        .not
        .toContain('proposedDateId=pd-1');
      expect(html)
        .toContain('proposedDateId=pd-2');
      expect(html)
        .toContain('id="status-chip"');
      // The deleted outcome is announced via the shared OOB status element.
      expect(html)
        .toContain('<p id="clipboard-status" class="visually-hidden" role="status" hx-swap-oob="true">Proposed date deleted</p>');
    });

    test('deleting with a missing proposedDateId is a no-op', async () => {
      const session = seedSession({
        status: 'Voting',
        proposedDates: [aProposedDate({id: 'pd-1', votable: true})],
      });
      const app = editApp({params: {id: session.id}, headers: {'HX-Request': 'true'}});
      await app.store.save(session);
      const saveSpy = vi.spyOn(app.store, 'save');

      const html = await (await handleProposedDateDeletePost(app)).text();

      const stored = await app.store.get(session.id);
      expect(stored?.proposedDates)
        .toHaveLength(1);
      expect(saveSpy)
        .not
        .toHaveBeenCalled();
      expect(html)
        .toContain('<p id="clipboard-status" class="visually-hidden" role="status" hx-swap-oob="true">Proposed date deleted</p>');
    });
  });

  describe('handleProposedDateVisibilityPost', () => {
    test('flips the votable flag on for a closed date', async () => {
      const session = seedSession({
        status: 'Voting',
        proposedDates: [aProposedDate({id: 'pd-1', votable: false})],
      });
      const app = editApp({
        params: {id: session.id},
        queries: {proposedDateId: 'pd-1', votable: 'true'},
      });
      await app.store.save(session);

      await handleProposedDateVisibilityPost(app);

      const stored = await app.store.get(session.id);
      expect(stored?.proposedDates[0]?.votable)
        .toBe(true);
    });

    test('flips the votable flag off for an open date', async () => {
      const session = seedSession({
        status: 'Voting',
        proposedDates: [aProposedDate({id: 'pd-1', votable: true})],
      });
      const app = editApp({
        params: {id: session.id},
        queries: {proposedDateId: 'pd-1', votable: 'false'},
      });
      await app.store.save(session);

      await handleProposedDateVisibilityPost(app);

      const stored = await app.store.get(session.id);
      expect(stored?.proposedDates[0]?.votable)
        .toBe(false);
    });

    test('renders the partial with the updated switch state when partial', async () => {
      const session = seedSession({
        status: 'Voting',
        proposedDates: [aProposedDate({id: 'pd-1', votable: false})],
      });
      const app = editApp({
        params: {id: session.id},
        queries: {proposedDateId: 'pd-1', votable: 'true'},
        headers: {'HX-Request': 'true'},
      });
      await app.store.save(session);

      const html = await (await handleProposedDateVisibilityPost(app)).text();

      expect(html)
        .toContain('<section id="proposed-dates-management"');
      expect(html)
        .toContain('proposed-date-visibility?proposedDateId=pd-1&amp;votable=false');
      expect(html)
        .toContain('proposed-date-confirm?proposedDateId=pd-1');
      expect(html)
        .toContain('<p id="clipboard-status" class="visually-hidden" role="status" hx-swap-oob="true">Voting enabled</p>');
    });

    test('updating visibility with a missing proposedDateId is a no-op', async () => {
      const session = seedSession({
        status: 'Voting',
        proposedDates: [aProposedDate({id: 'pd-1', votable: true})],
      });
      const app = editApp({
        params: {id: session.id},
        queries: {votable: 'false'},
        headers: {'HX-Request': 'true'},
      });
      await app.store.save(session);

      const html = await (await handleProposedDateVisibilityPost(app)).text();

      const stored = await app.store.get(session.id);
      expect(stored?.proposedDates[0]?.votable)
        .toBe(true);
      expect(html)
        .toContain('<p id="clipboard-status" class="visually-hidden" role="status" hx-swap-oob="true">Voting disabled</p>');
    });
  });

  describe('handleReopenPost', () => {
    test('reopens a confirmed session: Voting, count + 1, history, votes, and flags kept', async () => {
      const session = seedSession({
        status: 'Confirmed',
        reopenCount: 0,
        confirmedProposedDateId: 'pd-1',
        proposedDates: [
          aProposedDate({id: 'pd-1', votable: true}),
          aProposedDate({id: 'pd-2', votable: false}),
        ],
        votes: [aVote({proposedDateId: 'pd-1', participantId: 'player-1', type: 'Yes'})],
      });
      const app = editApp({params: {id: session.id}});
      await app.store.save(session);

      await handleReopenPost(app);

      const stored = await app.store.get(session.id);
      expect(stored?.status)
        .toBe('Voting');
      expect(stored?.reopenCount)
        .toBe(1);
      expect(stored?.confirmedProposedDateId)
        .toBe('pd-1');
      expect(stored?.proposedDates)
        .toEqual(session.proposedDates);
      expect(stored?.votes)
        .toEqual(session.votes);
    });

    test('renders the partial with the date-management controls and reopen count when partial', async () => {
      const session = seedSession({
        status: 'Confirmed',
        reopenCount: 0,
        confirmedProposedDateId: 'pd-1',
        proposedDates: [aProposedDate({id: 'pd-1', votable: true})],
      });
      const app = editApp({params: {id: session.id}, headers: {'HX-Request': 'true'}});
      await app.store.save(session);

      const html = await (await handleReopenPost(app)).text();

      expect(html)
        .toContain(`hx-post="/edit/${session.id}/proposed-date-confirm?proposedDateId=pd-1&amp;organizerPassword=${ORGANIZER_PASSWORD}"`);
      expect(html)
        .toContain('Reopened 1 time(s)');
      expect(html)
        .toContain('id="status-chip"');
      expect(html)
        .toContain('<p id="clipboard-status" class="visually-hidden" role="status" hx-swap-oob="true">Postponement reopened</p>');
      expect(html)
        .not
        .toContain(`hx-post="/edit/${session.id}/reopen"`);
    });
  });

  describe('handleRefreshClashesPost', () => {
    const identities = {
      home: {championship: 'MTTV 26/27', group: '219397', teamtable: '1732195'},
      away: {championship: 'MTTV 26/27', group: '219397', teamtable: '1732193'},
    };

    function checkedSession(): Postponement {
      return seedSession({
        homeTeam: 'Home Team',
        guestTeam: 'Guest Team',
        homeTeamIdentity: identities.home,
        guestTeamIdentity: identities.away,
        proposedDates: [
          aProposedDate({
            id: 'pd-1',
            clashes: {home: [{opponent: 'Old Opp', start: '2025-09-01T08:00'}], away: []},
          }),
        ],
      });
    }

    test('re-fetches both schedules, recomputes all clashes, replaces the stored snapshot, and saves once', async () => {
      const session = checkedSession();
      mockFetchMatches.mockResolvedValue([
        {day: 'Mo', date: '01.09.2025', time: '19:00', homeTeam: 'Home Team', guestTeam: 'Guest Team'},
      ]);
      const app = editApp({params: {id: session.id}, headers: {'HX-Request': 'true'}});
      await app.store.save(session);
      const saveSpy = vi.spyOn(app.store, 'save');

      const html = await (await handleRefreshClashesPost(app)).text();

      expect(mockFetchMatches)
        .toHaveBeenCalledTimes(2);
      expect(mockFetchMatches)
        .toHaveBeenCalledWith('MTTV 26/27', '219397', '1732195');
      expect(mockFetchMatches)
        .toHaveBeenCalledWith('MTTV 26/27', '219397', '1732193');
      const stored = await app.store.get(session.id);
      expect(stored?.proposedDates[0]?.clashes)
        .toEqual({
          home: [{opponent: 'Guest Team', start: '2025-09-01T19:00'}],
          away: [{opponent: 'Home Team', start: '2025-09-01T19:00'}],
        });
      // The manual refresh re-attaches the clash snapshot but never touches votable.
      expect(stored?.proposedDates[0]?.votable)
        .toBe(true);
      expect(saveSpy)
        .toHaveBeenCalledTimes(1);
      // The refreshed rows render immediately, without a failure notice.
      expect(html)
        .toContain('Home: 7:00 PM vs Guest Team');
      expect(html)
        .not
        .toContain('showing the previous results');
      // A successful refresh announces a short polite status.
      expect(html)
        .toContain('<p id="clipboard-status" class="visually-hidden" role="status" hx-swap-oob="true">Schedule check refreshed</p>');
    });

    test('a failed refresh keeps the previous snapshot, marks the clash data stale, and renders the failure notice', async () => {
      const session = checkedSession();
      mockFetchMatches.mockRejectedValue(new ClickTTError('click-tt is down'));
      const app = editApp({params: {id: session.id}, headers: {'HX-Request': 'true'}});
      await app.store.save(session);
      const saveSpy = vi.spyOn(app.store, 'save');

      const html = await (await handleRefreshClashesPost(app)).text();

      const stored = await app.store.get(session.id);
      expect(stored?.proposedDates[0]?.clashes)
        .toEqual({home: [{opponent: 'Old Opp', start: '2025-09-01T08:00'}], away: []});
      // The stale flag is the only change, so the session is written once.
      expect(saveSpy)
        .toHaveBeenCalledTimes(1);
      expect(stored?.clashDataStale)
        .toBe(true);
      // The stale snapshot still renders, and the organizer sees the failure notice.
      expect(html)
        .toContain('Home: 8:00 AM vs Old Opp');
      expect(html)
        .toContain('showing the previous results');
      // The failure notice already explains the state, so the stale notice is suppressed.
      expect(html)
        .not
        .toContain('without clash data');
    });

    test('a successful refresh clears a previously stale flag', async () => {
      const session = checkedSession();
      session.clashDataStale = true;
      mockFetchMatches.mockResolvedValue([
        {day: 'Mo', date: '01.09.2025', time: '19:00', homeTeam: 'Home Team', guestTeam: 'Guest Team'},
      ]);
      const app = editApp({params: {id: session.id}, headers: {'HX-Request': 'true'}});
      await app.store.save(session);

      const html = await (await handleRefreshClashesPost(app)).text();

      const stored = await app.store.get(session.id);
      expect(stored?.clashDataStale)
        .toBeUndefined();
      expect(html)
        .not
        .toContain('without clash data');
    });

    test('hand-entered session: never fetches and renders no failure notice', async () => {
      const session = seedSession({proposedDates: [aProposedDate()]});
      const app = editApp({params: {id: session.id}, headers: {'HX-Request': 'true'}});
      await app.store.save(session);

      const html = await (await handleRefreshClashesPost(app)).text();

      expect(mockFetchMatches)
        .not
        .toHaveBeenCalled();
      expect(html)
        .not
        .toContain('showing the previous results');
    });

    test('first check fails: no snapshot existed, so no "previous results" notice renders', async () => {
      const session = seedSession({
        homeTeam: 'Home Team',
        guestTeam: 'Guest Team',
        homeTeamIdentity: identities.home,
        guestTeamIdentity: identities.away,
        proposedDates: [aProposedDate({id: 'pd-1'})],
      });
      mockFetchMatches.mockRejectedValue(new ClickTTError('click-tt is down'));
      const app = editApp({params: {id: session.id}, headers: {'HX-Request': 'true'}});
      await app.store.save(session);

      const html = await (await handleRefreshClashesPost(app)).text();

      expect(html)
        .not
        .toContain('showing the previous results');
    });

    test('re-fetches the club meetings and replaces the stored occupancy snapshot alongside the clashes', async () => {
      const session = seedSession({
        homeTeam: 'Home Team',
        guestTeam: 'Guest Team',
        clubId: '33282',
        homeTeamIdentity: identities.home,
        guestTeamIdentity: identities.away,
        proposedDates: [
          aProposedDate({
            id: 'pd-1',
            clashes: {home: [], away: []},
            venueOccupancy: {count: 0, matches: []},
          }),
        ],
      });
      mockFetchMatches.mockResolvedValue([]);
      mockFetchClubMeetings.mockResolvedValue([
        {
          day: 'Di',
          date: '01.09.2025',
          time: '19:30',
          homeTeam: 'Ostermundigen',
          guestTeam: 'Köniz II',
          venueNumber: 1,
        },
      ]);
      const app = editApp({params: {id: session.id}, headers: {'HX-Request': 'true'}});
      await app.store.save(session);

      const html = await (await handleRefreshClashesPost(app)).text();

      expect(mockFetchClubMeetings)
        .toHaveBeenCalledTimes(1);
      expect(mockFetchClubMeetings)
        .toHaveBeenCalledWith('33282', '01.07.2026', '30.06.2027');
      const stored = await app.store.get(session.id);
      expect(stored?.proposedDates[0]?.venueOccupancy)
        .toEqual({
          count: 1,
          matches: [{opponent: 'Köniz II', start: '2025-09-01T19:30'}],
        });
      expect(stored?.proposedDates[0]?.clashes)
        .toEqual({home: [], away: []});
      expect(html)
        .toContain('1 other game at this venue');
    });
  });

  describe('buildOwnTeamView', () => {
    test('returns the organizer-team roster and per-date results with a localized display', () => {
      const session = seedSession({
        organizerTeam: 'home',
        players: [
          aPlayer({id: 'p1', name: 'Voter', teamId: 'home'}),
          aPlayer({id: 'p2', name: 'SitsOut', teamId: 'home'}),
          aPlayer({id: 'a1', name: 'Away', teamId: 'away'}),
        ],
        proposedDates: [aProposedDate({id: 'pd-1'})],
        votes: [aVote({proposedDateId: 'pd-1', participantId: 'p1', type: 'Yes'})],
      });

      const view = buildOwnTeamView(session, 'en-US');

      expect(view.organizerPlayers
        .map((p) => p.name))
        .toEqual(['Voter', 'SitsOut']);
      expect(view.ownTeamResults)
        .toHaveLength(1);
      expect(view.ownTeamResults[0])
        .toMatchObject({
          dateId: 'pd-1',
          display: expect.stringContaining('2025'),
          voted: 1,
          total: 2,
          votes: [
            {playerId: 'p1', playerName: 'Voter', vote: 'Yes'},
            {playerId: 'p2', playerName: 'SitsOut', vote: null},
          ],
          nonVoters: [{playerId: 'p2', playerName: 'SitsOut', joined: false}],
        });
    });

    test('uses the organizer team even when it is the away side', () => {
      const session = seedSession({
        organizerTeam: 'away',
        players: [
          aPlayer({id: 'h1', name: 'Home', teamId: 'home'}),
          aPlayer({id: 'a1', name: 'AwayPlayer', teamId: 'away'}),
        ],
        proposedDates: [aProposedDate({id: 'pd-1'})],
        votes: [aVote({proposedDateId: 'pd-1', participantId: 'a1', type: 'No'})],
      });

      const view = buildOwnTeamView(session, 'en-US');

      expect(view.organizerPlayers
        .map((p) => p.name))
        .toEqual(['AwayPlayer']);
      expect(view.ownTeamResults[0])
        .toMatchObject({
          voted: 1,
          total: 1,
          votes: [{playerId: 'a1', playerName: 'AwayPlayer', vote: 'No'}],
        });
    });

    test('returns no dates when the organizer team has no proposed dates', () => {
      const session = seedSession({
        organizerTeam: 'home',
        players: [aPlayer({id: 'p1', name: 'Voter', teamId: 'home'})],
      });

      const view = buildOwnTeamView(session, 'en-US');

      expect(view.organizerPlayers.map((p) => p.name))
        .toEqual(['Voter']);
      expect(view.ownTeamResults)
        .toEqual([]);
    });
  });

  describe('sort persistence', () => {
    const sortDates = [
      aProposedDate({
        id: 'pd-a',
        dateTimeRange: {start: '2026-09-01T20:00', end: '2026-09-01T22:00'},
        votable: true,
        venueNumber: 1,
      }),
      aProposedDate({
        id: 'pd-b',
        dateTimeRange: {start: '2026-09-08T20:00', end: '2026-09-08T22:00'},
        votable: true,
        venueNumber: 1,
      }),
    ];

    test('handleEditGet defaults to date grouping without a sort query', async () => {
      const session = seedSession({proposedDates: sortDates});
      const app = editApp({params: {id: session.id}});
      await app.store.save(session);

      const html = await (await handleEditGet(app)).text();

      expect(html)
        .toContain('value="date" checked');
      expect(html)
        .toContain('Week 36');
    });

    test('handleEditGet renders availability grouping when ?sort=availability', async () => {
      const session = seedSession({proposedDates: sortDates});
      const app = editApp({params: {id: session.id}, queries: {sort: 'availability'}});
      await app.store.save(session);

      const html = await (await handleEditGet(app)).text();

      expect(html)
        .toContain('value="availability" checked');
      expect(html)
        .toContain('<span>Available: 0</span>');
    });

    test('handleEditGet answers an HTMX sort request with the bare grid fragment', async () => {
      const session = seedSession({proposedDates: sortDates});
      const app = editApp({
        params: {id: session.id},
        queries: {sort: 'availability'},
        headers: {'HX-Request': 'true'},
      });
      await app.store.save(session);

      const html = await (await handleEditGet(app)).text();

      expect(html)
        .toContain('<div id="edit-grid" class="edit-grid">');
      expect(html)
        .not
        .toContain('<main id="main-content"');
      expect(html)
        .not
        .toContain('<!DOCTYPE html>');
    });

    test('renderEditPartials keeps the availability sort from the HX-Current-URL header', () => {
      const session = seedSession({proposedDates: sortDates});
      const app = editApp({
        headers: {'HX-Current-URL': 'https://game-scheduler.localhost:3000/edit/test-session?sort=availability'},
      });

      const html = renderEditPartials(app, session);

      expect(html)
        .toContain('value="availability" checked');
      expect(html)
        .toContain('<span>Available: 0</span>');
    });

    test('renderEditPartials defaults to date grouping without the header', () => {
      const session = seedSession({proposedDates: sortDates});
      const app = editApp();

      const html = renderEditPartials(app, session);

      expect(html)
        .toContain('value="date" checked');
      expect(html)
        .toContain('Week 36');
    });

    test('renderEditPartials falls back to date grouping when the header URL is invalid', () => {
      const session = seedSession({proposedDates: sortDates});
      const app = editApp({headers: {'HX-Current-URL': 'not a url'}});

      const html = renderEditPartials(app, session);

      expect(html)
        .toContain('value="date" checked');
    });

    test('renderEditPartials treats an unknown sort value as date', () => {
      const session = seedSession({proposedDates: sortDates});
      const app = editApp({
        headers: {'HX-Current-URL': 'https://game-scheduler.localhost:3000/edit/test-session?sort=bogus'},
      });

      const html = renderEditPartials(app, session);

      expect(html)
        .toContain('value="date" checked');
    });

    test('handleEditGet renders the original match datetime when the session has one', async () => {
      const session = seedSession({proposedDates: sortDates, originalMatchDateTime: '2026-09-01T20:00'});
      const app = editApp({params: {id: session.id}});
      await app.store.save(session);

      const html = await (await handleEditGet(app)).text();

      expect(html)
        .toContain('Tu, Sep 1, 2026, 8:00 PM');
    });
  });

  describe('organizer-captain authorization', () => {
    test('a bare edit GET without the password is refused with a 403', async () => {
      const session = seedSession();
      const app = createApp({params: {id: session.id}});
      await app.store.save(session);

      await expectForbidden(handleEditGet(app));
    });

    test('an edit GET with a wrong password is refused with a 403', async () => {
      const session = seedSession();
      const app = createApp({params: {id: session.id}, queries: {organizerPassword: 'wrong'}});
      await app.store.save(session);

      await expectForbidden(handleEditGet(app));
    });

    test('a bare edit POST without the password is refused with a 403', async () => {
      const session = seedSession();
      const app = createApp({params: {id: session.id}, body: {playerName: 'Alice'}});
      await app.store.save(session);

      await expectForbidden(handleEditPlayersPost(app));
    });

    test('an edit GET with the correct password renders the edit page', async () => {
      const session = seedSession();
      const app = editApp({params: {id: session.id}});
      await app.store.save(session);

      const response = await handleEditGet(app);

      expect(response.status)
        .toBe(200);
    });
  });

});
