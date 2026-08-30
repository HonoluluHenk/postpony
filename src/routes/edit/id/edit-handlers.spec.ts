import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { App } from '../../../app';
import { aPlayer, aProposedDate, aSession, aVote } from '../../../lib/__test-utils__/builders';
import { fetchMatches } from '../../../lib/click-tt-scraper';
import { ClickTTError } from '../../../lib/errors';
import { generateProposedDates } from '../../../lib/proposed-dates-generator';
import type { Postponement } from '../../../lib/models';
import { MemorySessionStore } from '../../../lib/session-store';
import * as temporalUtils from '../../../lib/temporal-utils';
import { LOCALE_KEY } from '../../../locales';
import { handleConfirmDatePost } from './confirm-date-post';
import { buildOwnTeamView } from './own-team-view';
import { handleEditPlayersPost } from './players-post';
import { handleProposedDateDeletePost } from './proposed-date-delete-post';
import { handleEditProposedDatesPost } from './proposed-dates-post';
import { handleProposedDateVisibilityPost } from './proposed-date-visibility-post';
import { handleRefreshClashesPost } from './refresh-clashes-post';
import { handleReopenPost } from './reopen-post';

vi.mock('../../../lib/click-tt-scraper', () => ({
  fetchMatches: vi.fn(),
}));

const mockFetchMatches = vi.mocked(fetchMatches);

interface MockOptions {
  params?: Record<string, string>;
  queries?: Record<string, string>;
  headers?: Record<string, string>;
  body?: Record<string, unknown>;
}

function createApp(options: MockOptions = {}): App {
  const {params = {}, queries = {}, headers = {}, body = {}} = options;
  const store = new MemorySessionStore();
  const context = {
    get: (key: string): string | undefined => (key === LOCALE_KEY ? 'en-US' : undefined),
    req: {
      param: (name: string): string | undefined => params[name],
      query: (name: string): string | undefined => queries[name],
      header: (name: string): string | undefined => headers[name],
      parseBody: (): Promise<Record<string, unknown>> => Promise.resolve(body),
      url: 'https://game-scheduler.localhost:3000/',
    },
    html: vi.fn((content: string, init?: ResponseInit) => new Response(content, init)),
    redirect: vi.fn((url: string) => new Response(null, {status: 302, headers: {Location: url}})),
  } as any;

  return App.create(context, store);
}

const FIXED_TODAY_ISO = '2026-08-25T08:00';

describe('edit handlers', () => {

  beforeEach(() => {
    vi.spyOn(temporalUtils, 'nowPlainDateTimeIso')
      .mockReturnValue(FIXED_TODAY_ISO);
    mockFetchMatches.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('handleEditPlayersPost', () => {
    test('throws when the session does not exist', async () => {
      const app = createApp({params: {id: 'missing'}});

      await expect(handleEditPlayersPost(app))
        .rejects
        .toThrow('Session not found');
    });

    test('adds a player to a session that has none', async () => {
      const session = aSession();
      const app = createApp({params: {id: session.id}, body: {playerName: 'Alice'}});
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
      const session = aSession({players: [aPlayer()]});
      const app = createApp({params: {id: session.id}, body: {playerName: 'Bob'}});
      await app.store.save(session);

      await handleEditPlayersPost(app);

      const stored = await app.store.get(session.id);
      expect(stored?.players.map((p) => p.name))
        .toEqual(['Test Player', 'Bob']);
      expect(stored?.players[1]?.name)
        .toBe('Bob');
    });

    test('redirects without adding a player when the name is missing', async () => {
      const session = aSession();
      const app = createApp({params: {id: session.id}, body: {}});
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
    test('throws when the session does not exist', async () => {
      const app = createApp({params: {id: 'missing'}});

      await expect(handleEditProposedDatesPost(app))
        .rejects
        .toThrow('Session not found');
    });

    test('adds a proposed date to the session', async () => {
      const session = aSession();
      const app = createApp({params: {id: session.id}, body: {proposedDateTime: '09/01/2025 08:00 pm'}});
      await app.store.save(session);

      await handleEditProposedDatesPost(app);

      const stored = await app.store.get(session.id);
      expect(stored?.proposedDates)
        .toHaveLength(1);
      const proposedDate = stored?.proposedDates[0];
      expect(proposedDate?.sessionId)
        .toBe(session.id);
      expect(proposedDate?.proposerId)
        .toBe('owner');
      expect(proposedDate?.dateTimeRange.start)
        .toBe(proposedDate?.dateTimeRange.end);
      expect(proposedDate?.dateTimeRange.start.toString())
        .toBe('2025-09-01T20:00:00');
    });

    test('accepts a tolerant en-US input (no leading zeros, no space before pm) and normalizes to ISO on save', async () => {
      const session = aSession();
      const app = createApp({params: {id: session.id}, body: {proposedDateTime: '9/1/2025 8:00pm'}});
      await app.store.save(session);

      await handleEditProposedDatesPost(app);

      const stored = await app.store.get(session.id);
      expect(stored?.proposedDates)
        .toHaveLength(1);
      expect(stored?.proposedDates[0]?.dateTimeRange.start.toString())
        .toBe('2025-09-01T20:00:00');
    });

    test('appends to the existing proposed dates', async () => {
      const session = aSession({proposedDates: [aProposedDate()]});
      const app = createApp({params: {id: session.id}, body: {proposedDateTime: '09/02/2025 06:30 pm'}});
      await app.store.save(session);

      await handleEditProposedDatesPost(app);

      const stored = await app.store.get(session.id);
      expect(stored?.proposedDates.map((d) => d.dateTimeRange.start))
        .toEqual(['2025-09-01T20:00:00', '2025-09-02T18:30:00']);
    });

    test('moves a Draft session to Voting when the first date is added', async () => {
      const session = aSession();
      const app = createApp({params: {id: session.id}, body: {proposedDateTime: '09/01/2025 08:00 pm'}});
      await app.store.save(session);

      await handleEditProposedDatesPost(app);

      const stored = await app.store.get(session.id);
      expect(stored?.status)
        .toBe('Voting');
      expect(stored?.proposedDates[0]?.votable)
        .toBe(true);
    });

    test('redirects without adding when the datetime is invalid', async () => {
      const session = aSession();
      const app = createApp({params: {id: session.id}, body: {proposedDateTime: 'not-a-date'}});
      await app.store.save(session);

      const response = await handleEditProposedDatesPost(app);

      const stored = await app.store.get(session.id);
      expect(stored?.proposedDates)
        .toHaveLength(0);
      expect(response.status)
        .toBe(302);
    });

    test('tuple branch: persists the expected count and renders a success toast with the count', async () => {
      const session = aSession({
        originalMatchDateTime: '2026-09-02T16:00',
        proposedDates: [],
        status: 'Draft',
      });
      const app = createApp({
        params: {id: session.id},
        headers: {'HX-Request': 'true'},
        body: {
          generate: 'tuple',
          'time[]': ['8:00 pm'],
        },
      });
      await app.store.save(session);

      const expected = generateProposedDates({
        anchorIso: '2026-09-02T16:00',
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
      // US 14: the submitted time survives the success re-render.
      expect(html)
        .toContain('value="8:00 pm"');
    });

    test('tuple branch: empty rows are skipped at the parse boundary', async () => {
      const session = aSession({
        originalMatchDateTime: '2026-09-02T16:00',
        proposedDates: [],
        status: 'Draft',
      });
      const app = createApp({
        params: {id: session.id},
        headers: {'HX-Request': 'true'},
        body: {
          generate: 'tuple',
          'time[]': ['8:00 pm', '', '9:00 pm'],
        },
      });
      await app.store.save(session);

      // time[0] -> weekday 1 (Mon), time[2] -> weekday 3 (Wed); time[1] is empty.
      const expected = generateProposedDates({
        anchorIso: '2026-09-02T16:00',
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
      const session = aSession({originalMatchDateTime: '2026-09-02T16:00'});
      const app = createApp({
        params: {id: session.id},
        headers: {'HX-Request': 'true'},
        body: {
          generate: 'tuple',
          'time[]': ['8:00 pm', 'not-a-time', '9:00 pm'],
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
      const session = aSession({originalMatchDateTime: '2026-09-02T16:00'});
      const app = createApp({
        params: {id: session.id},
        headers: {'HX-Request': 'true'},
        body: {
          generate: 'tuple',
          'time[]': ['', '', '', '', '', '', ''],
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
      const session = aSession({originalMatchDateTime: '2026-09-02T16:00'});
      const times = Array.from({length: 15}, (): string => '8:00 pm');
      const app = createApp({
        params: {id: session.id},
        headers: {'HX-Request': 'true'},
        body: {
          generate: 'tuple',
          'time[]': times,
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

    test('tuple branch anchor missing: success toast plus the no_anchor fallback warning', async () => {
      const session = aSession({
        status: 'Draft',
        proposedDates: [],
      });
      const app = createApp({
        params: {id: session.id},
        headers: {'HX-Request': 'true'},
        body: {
          generate: 'tuple',
          'time[]': ['8:00 pm'],
        },
      });
      await app.store.save(session);

      const expected = generateProposedDates({
        anchorIso: undefined,
        todayIso: FIXED_TODAY_ISO,
        tuples: [{weekday: 1, hour: 20, minute: 0}],
        existingStarts: [],
      });
      expect(expected.usedFallbackWindow)
        .toBe(true);
      expect(expected.added.length)
        .toBeGreaterThan(0);

      const html = await (await handleEditProposedDatesPost(app)).text();

      const stored = await app.store.get(session.id);
      expect(stored?.proposedDates.map((d) => d.dateTimeRange.start))
        .toEqual(expected.added);
      expect(html)
        .toContain('No match anchor');
      expect(html)
        .toContain(`>${expected.added.length} dates added<`);
    });

    test('tuple branch zero-result path: no store write, renders the inline empty-result message', async () => {
      const session = aSession({
        originalMatchDateTime: '2020-01-01T16:00',
      });
      const app = createApp({
        params: {id: session.id},
        headers: {'HX-Request': 'true'},
        body: {
          generate: 'tuple',
          'time[]': ['8:00 pm'],
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
      const session = aSession({originalMatchDateTime: '2026-09-02T16:00'});
      const app = createApp({
        params: {id: session.id},
        headers: {'HX-Request': 'true'},
        body: {
          generate: 'tuple',
          'time[]': [],
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

    test('non-partial tuple submit: redirects to the edit page rather than rendering html', async () => {
      const session = aSession({originalMatchDateTime: '2026-09-02T16:00'});
      const app = createApp({
        params: {id: session.id},
        body: {
          generate: 'tuple',
          'time[]': ['8:00 pm'],
        },
      });
      await app.store.save(session);

      const response = await handleEditProposedDatesPost(app);

      expect(response.status)
        .toBe(302);
      expect(response.headers.get('location'))
        .toBe(`/edit/${session.id}`);
      const expected = generateProposedDates({
        anchorIso: '2026-09-02T16:00',
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
      const session = aSession({originalMatchDateTime: '2026-09-02T16:00'});
      const app = createApp({
        params: {id: session.id},
        body: {
          generate: 'tuple',
          'time[]': ['not-a-time'],
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
      const session = aSession({originalMatchDateTime: '2026-09-02T16:00'});
      const times = Array.from({length: 16}, (): string => '8:00 pm');
      const app = createApp({
        params: {id: session.id},
        body: {
          generate: 'tuple',
          'time[]': times,
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
      const session = aSession({
        originalMatchDateTime: '2026-09-02T16:00',
        proposedDates: [
          aProposedDate({
            id: 'pd-existing',
            dateTimeRange: {start: existingDateIso, end: existingDateIso},
          }),
        ],
      });
      const app = createApp({
        params: {id: session.id},
        headers: {'HX-Request': 'true'},
        body: {
          generate: 'tuple',
          'time[]': ['8:00 pm'],
        },
      });
      await app.store.save(session);

      const expected = generateProposedDates({
        anchorIso: '2026-09-02T16:00',
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
      const session = aSession({originalMatchDateTime: '2026-09-02T16:00'});
      const app = createApp({
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
      const session = aSession({originalMatchDateTime: '2026-09-02T16:00', status: 'Draft'});
      const app = createApp({
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
        return aSession({
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
        const app = createApp({
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
          anchorIso: '2026-09-02T16:00',
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
        const app = createApp({
          params: {id: session.id},
          headers: {'HX-Request': 'true'},
          body: {generate: 'tuple', 'time[]': ['8:00 pm']},
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
        const app = createApp({
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
        const app = createApp({
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
          anchorIso: '2026-09-02T16:00',
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
        const app = createApp({
          params: {id: session.id},
          headers: {'HX-Request': 'true'},
          body: {generate: 'tuple', 'time[]': ['8:00 pm', '8:00 pm']},
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
        const app = createApp({
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
        const app = createApp({
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

      test('generator run: a failed scrape still saves the generated dates without clash data', async () => {
        const session = clashSession();
        session.originalMatchDateTime = '2026-09-02T16:00';
        session.proposedDates = [];
        session.status = 'Draft';
        mockFetchMatches.mockRejectedValue(new Error('network down'));
        const app = createApp({
          params: {id: session.id},
          headers: {'HX-Request': 'true'},
          body: {generate: 'tuple', 'time[]': ['8:00 pm']},
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
        const session = aSession();
        const app = createApp({
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
    });
  });

  test('non-partial tuple submit with malformed body: redirects rather than rendering html', async () => {
    const session = aSession({originalMatchDateTime: '2026-09-02T16:00'});
    const app = createApp({
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

  describe('partial (HX-Request) fragment rendering', () => {
    const partialHeaders = {'HX-Request': 'true'};

    test('players: renders the team section with an empty error-container on success', async () => {
      const session = aSession();
      const app = createApp({
        params: {id: session.id},
        headers: partialHeaders,
        body: {playerName: 'Alice'},
      });
      await app.store.save(session);

      const html = await (await handleEditPlayersPost(app)).text();

      expect(html)
        .toContain('<section id="team-management"');
      expect(html)
        .toContain('Alice');
      expect(html)
        .toContain('id="error-container" hx-swap-oob="true"');
      expect(html)
        .toContain('<section id="own-team-votes" hx-swap-oob="true" hidden="">');
      expect(html)
        .not
        .toContain('error padding white-text');
      expect(html)
        .not
        .toContain('Your Team Votes');
    });

    test('players: renders the error-container and keeps the invalid input on failure', async () => {
      const session = aSession();
      const app = createApp({params: {id: session.id}, headers: partialHeaders, body: {playerName: ''}});
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
    });

    test('proposed dates: renders the section and a success toast on success', async () => {
      const session = aSession();
      const app = createApp({
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
        .toContain('<section id="own-team-votes" class="padding small-round surface-variant" hx-swap-oob="true"');
    });

    test('proposed dates: renders the error-container on an invalid datetime', async () => {
      const session = aSession();
      const app = createApp({
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
    });
  });

  describe('handleConfirmDatePost', () => {
    test('throws when the session does not exist', async () => {
      const app = createApp({params: {id: 'missing'}});

      await expect(handleConfirmDatePost(app))
        .rejects
        .toThrow('Session not found');
    });

    test('confirms a votable date and locks the session', async () => {
      const session = aSession({
        status: 'Voting',
        proposedDates: [aProposedDate({id: 'pd-1', votable: true})],
      });
      const app = createApp({params: {id: session.id}, queries: {proposedDateId: 'pd-1'}});
      await app.store.save(session);

      await handleConfirmDatePost(app);

      const stored = await app.store.get(session.id);
      expect(stored?.status)
        .toBe('Confirmed');
      expect(stored?.confirmedProposedDateId)
        .toBe('pd-1');
    });

    test('is a no-op for a date that is not votable', async () => {
      const session = aSession({
        status: 'Voting',
        proposedDates: [aProposedDate({id: 'pd-1', votable: false})],
      });
      const app = createApp({params: {id: session.id}, queries: {proposedDateId: 'pd-1'}});
      await app.store.save(session);

      await handleConfirmDatePost(app);

      const stored = await app.store.get(session.id);
      expect(stored?.status)
        .toBe('Voting');
      expect(stored?.confirmedProposedDateId)
        .toBeUndefined();
    });

    test('is idempotent: confirming the same date again keeps the locked state', async () => {
      const session = aSession({
        status: 'Confirmed',
        confirmedProposedDateId: 'pd-1',
        proposedDates: [aProposedDate({id: 'pd-1', votable: true})],
      });
      const app = createApp({params: {id: session.id}, queries: {proposedDateId: 'pd-1'}});
      await app.store.save(session);

      await handleConfirmDatePost(app);

      const stored = await app.store.get(session.id);
      expect(stored?.status)
        .toBe('Confirmed');
      expect(stored?.confirmedProposedDateId)
        .toBe('pd-1');
    });

    test('confirming a clashing date renders the inline warning and moves to Confirmed', async () => {
      const session = aSession({
        status: 'Voting',
        proposedDates: [
          aProposedDate({
            id: 'pd-1',
            votable: true,
            clashes: {home: [{opponent: 'Thun', start: '2025-09-01T18:00'}], away: []},
          }),
        ],
      });
      const app = createApp({
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
    });

    test('confirming a clash-free date renders no warning', async () => {
      const session = aSession({
        status: 'Voting',
        proposedDates: [
          aProposedDate({
            id: 'pd-1',
            votable: true,
            clashes: {home: [], away: []},
          }),
        ],
      });
      const app = createApp({
        params: {id: session.id},
        queries: {proposedDateId: 'pd-1'},
        headers: {'HX-Request': 'true'},
      });
      await app.store.save(session);

      const html = await (await handleConfirmDatePost(app)).text();

      expect(html)
        .not
        .toContain('A scheduled game clashes with this date.');
    });

    test('judges the warning from the date found via confirmedProposedDateId, not the query', async () => {
      const session = aSession({
        status: 'Voting',
        proposedDates: [
          aProposedDate({
            id: 'pd-clashing',
            votable: true,
            clashes: {home: [{opponent: 'Thun', start: '2025-09-01T18:00'}], away: []},
          }),
          aProposedDate({
            id: 'pd-clean',
            votable: true,
            clashes: {home: [], away: []},
          }),
        ],
      });
      const app = createApp({
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
      const session = aSession({
        status: 'Voting',
        proposedDates: [aProposedDate({id: 'pd-1', votable: true})],
      });
      const app = createApp({
        params: {id: session.id},
        queries: {proposedDateId: 'pd-1'},
        headers: {'HX-Request': 'true'},
      });
      await app.store.save(session);

      const html = await (await handleConfirmDatePost(app)).text();

      expect(html)
        .toContain('<section id="proposed-dates-management"');
      expect(html)
        .toContain(`hx-post="/edit/${session.id}/reopen"`);
      expect(html)
        .not
        .toContain('proposed-date-confirm');
      expect(html)
        .toContain('id="status-chip" hx-swap-oob="true"');
      expect(html)
        .toContain('<section id="own-team-votes" class="padding small-round surface-variant" hx-swap-oob="true"');
    });

    test('redirects to the edit page when not partial', async () => {
      const session = aSession({
        status: 'Voting',
        proposedDates: [aProposedDate({id: 'pd-1', votable: true})],
      });
      const app = createApp({params: {id: session.id}, queries: {proposedDateId: 'pd-1'}});
      await app.store.save(session);

      const response = await handleConfirmDatePost(app);

      expect(response.status)
        .toBe(302);
      expect(response.headers.get('location'))
        .toBe(`/edit/${session.id}?ownerPassword=`);
    });
  });

  describe('handleProposedDateDeletePost', () => {
    test('throws when the session does not exist', async () => {
      const app = createApp({params: {id: 'missing'}});

      await expect(handleProposedDateDeletePost(app))
        .rejects
        .toThrow('Session not found');
    });

    test('removes the date and its votes', async () => {
      const session = aSession({
        status: 'Voting',
        proposedDates: [
          aProposedDate({id: 'pd-1'}),
          aProposedDate({id: 'pd-2'}),
        ],
        votes: [aVote({proposedDateId: 'pd-1', participantId: 'player-1', type: 'Yes'})],
      });
      const app = createApp({params: {id: session.id}, queries: {proposedDateId: 'pd-1'}});
      await app.store.save(session);

      await handleProposedDateDeletePost(app);

      const stored = await app.store.get(session.id);
      expect(stored?.proposedDates.map((pd) => pd.id))
        .toEqual(['pd-2']);
      expect(stored?.votes)
        .toHaveLength(0);
    });

    test('renders the partial with the remaining date-management controls when partial', async () => {
      const session = aSession({
        status: 'Voting',
        proposedDates: [
          aProposedDate({id: 'pd-1', votable: true}),
          aProposedDate({id: 'pd-2', votable: false}),
        ],
      });
      const app = createApp({
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
        .toContain('id="status-chip" hx-swap-oob="true"');
    });

    test('redirects to the edit page when not partial', async () => {
      const session = aSession({
        status: 'Voting',
        proposedDates: [aProposedDate({id: 'pd-1'})],
      });
      const app = createApp({params: {id: session.id}, queries: {proposedDateId: 'pd-1'}});
      await app.store.save(session);

      const response = await handleProposedDateDeletePost(app);

      expect(response.status)
        .toBe(302);
      expect(response.headers.get('location'))
        .toBe(`/edit/${session.id}?ownerPassword=`);
    });
  });

  describe('handleProposedDateVisibilityPost', () => {
    test('throws when the session does not exist', async () => {
      const app = createApp({params: {id: 'missing'}});

      await expect(handleProposedDateVisibilityPost(app))
        .rejects
        .toThrow('Session not found');
    });

    test('flips the votable flag on for a closed date', async () => {
      const session = aSession({
        status: 'Voting',
        proposedDates: [aProposedDate({id: 'pd-1', votable: false})],
      });
      const app = createApp({
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
      const session = aSession({
        status: 'Voting',
        proposedDates: [aProposedDate({id: 'pd-1', votable: true})],
      });
      const app = createApp({
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
      const session = aSession({
        status: 'Voting',
        proposedDates: [aProposedDate({id: 'pd-1', votable: false})],
      });
      const app = createApp({
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
    });
  });

  describe('handleReopenPost', () => {
    test('throws when the session does not exist', async () => {
      const app = createApp({params: {id: 'missing'}});

      await expect(handleReopenPost(app))
        .rejects
        .toThrow('Session not found');
    });

    test('reopens a confirmed session: Voting, count + 1, history, votes, and flags kept', async () => {
      const session = aSession({
        status: 'Confirmed',
        reopenCount: 0,
        confirmedProposedDateId: 'pd-1',
        proposedDates: [
          aProposedDate({id: 'pd-1', votable: true}),
          aProposedDate({id: 'pd-2', votable: false}),
        ],
        votes: [aVote({proposedDateId: 'pd-1', participantId: 'player-1', type: 'Yes'})],
      });
      const app = createApp({params: {id: session.id}});
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
      const session = aSession({
        status: 'Confirmed',
        reopenCount: 0,
        confirmedProposedDateId: 'pd-1',
        proposedDates: [aProposedDate({id: 'pd-1', votable: true})],
      });
      const app = createApp({params: {id: session.id}, headers: {'HX-Request': 'true'}});
      await app.store.save(session);

      const html = await (await handleReopenPost(app)).text();

      expect(html)
        .toContain(`hx-post="/edit/${session.id}/proposed-date-confirm?proposedDateId=pd-1"`);
      expect(html)
        .toContain('Reopened 1 time(s)');
      expect(html)
        .toContain('id="status-chip" hx-swap-oob="true"');
      expect(html)
        .not
        .toContain(`hx-post="/edit/${session.id}/reopen"`);
    });

    test('redirects to the edit page when not partial', async () => {
      const session = aSession({
        status: 'Confirmed',
        reopenCount: 0,
        confirmedProposedDateId: 'pd-1',
        proposedDates: [aProposedDate({id: 'pd-1', votable: true})],
      });
      const app = createApp({params: {id: session.id}});
      await app.store.save(session);

      const response = await handleReopenPost(app);

      expect(response.status)
        .toBe(302);
      expect(response.headers.get('location'))
        .toBe(`/edit/${session.id}?ownerPassword=`);
    });
  });

  describe('handleRefreshClashesPost', () => {
    const identities = {
      home: {championship: 'MTTV 26/27', group: '219397', teamtable: '1732195'},
      away: {championship: 'MTTV 26/27', group: '219397', teamtable: '1732193'},
    };

    function checkedSession(): Postponement {
      return aSession({
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

    test('throws when the session does not exist', async () => {
      const app = createApp({params: {id: 'missing'}});

      await expect(handleRefreshClashesPost(app))
        .rejects
        .toThrow('Session not found');
    });

    test('re-fetches both schedules, recomputes all clashes, replaces the stored snapshot, and saves once', async () => {
      const session = checkedSession();
      mockFetchMatches.mockResolvedValue([
        {day: 'Mo', date: '01.09.2025', time: '19:00', homeTeam: 'Home Team', guestTeam: 'Guest Team'},
      ]);
      const app = createApp({params: {id: session.id}, headers: {'HX-Request': 'true'}});
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
    });

    test('a failed refresh keeps the previous snapshot, saves once, and renders the failure notice', async () => {
      const session = checkedSession();
      mockFetchMatches.mockRejectedValue(new ClickTTError('click-tt is down'));
      const app = createApp({params: {id: session.id}, headers: {'HX-Request': 'true'}});
      await app.store.save(session);
      const saveSpy = vi.spyOn(app.store, 'save');

      const html = await (await handleRefreshClashesPost(app)).text();

      const stored = await app.store.get(session.id);
      expect(stored?.proposedDates[0]?.clashes)
        .toEqual({home: [{opponent: 'Old Opp', start: '2025-09-01T08:00'}], away: []});
      expect(saveSpy)
        .toHaveBeenCalledTimes(1);
      // The stale snapshot still renders, and the owner sees the failure notice.
      expect(html)
        .toContain('Home: 8:00 AM vs Old Opp');
      expect(html)
        .toContain('showing the previous results');
    });

    test('hand-entered session: never fetches and renders no failure notice', async () => {
      const session = aSession({proposedDates: [aProposedDate()]});
      const app = createApp({params: {id: session.id}, headers: {'HX-Request': 'true'}});
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
      const session = aSession({
        homeTeam: 'Home Team',
        guestTeam: 'Guest Team',
        homeTeamIdentity: identities.home,
        guestTeamIdentity: identities.away,
        proposedDates: [aProposedDate({id: 'pd-1'})],
      });
      mockFetchMatches.mockRejectedValue(new ClickTTError('click-tt is down'));
      const app = createApp({params: {id: session.id}, headers: {'HX-Request': 'true'}});
      await app.store.save(session);

      const html = await (await handleRefreshClashesPost(app)).text();

      expect(html)
        .not
        .toContain('showing the previous results');
    });
  });

  describe('buildOwnTeamView', () => {
    test('returns the organizer-team roster and per-date results with a localized display', () => {
      const session = aSession({
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
      const session = aSession({
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
      const session = aSession({
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

});