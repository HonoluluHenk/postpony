import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { App } from '../../app';
import { aPlayer, aProposedDate, aSession, aVote } from '../../lib/__test-utils__/builders';
import { fetchClubMeetings, fetchMatches } from '../../lib/click-tt-scraper';
import { createApp, type MockOptions } from '../../lib/__test-utils__/create-app';
import { hashPassword } from '../../lib/crypto-utils';
import { AppError, ClickTTError } from '../../lib/errors';
import type { Postponement } from '../../lib/models';
import { handleOpponentAcceptedPost } from './accepted-post';
import { handleOpponentGet } from './opponent-get';
import { handleOpponentPlayersPost } from './players-post';
import { handleOpponentRefreshPost } from './refresh-clashes-post';
import { handleOpponentVotablePost } from './votable-post';

vi.mock('../../lib/click-tt-scraper', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/click-tt-scraper')>();
  return {
    ...actual,
    fetchMatches: vi.fn(),
    fetchClubMeetings: vi.fn(),
  };
});

const mockFetchMatches = vi.mocked(fetchMatches);
const mockFetchClubMeetings = vi.mocked(fetchClubMeetings);

const OPPONENT_PASSWORD = 'opponent-captain-pw';
// ponytail: one precomputed hash shared by every seeded session, so the
// opponent-captain guard can be satisfied without a PBKDF2 derivation per test.
const opponentPasswordHash = await hashPassword(OPPONENT_PASSWORD);

function seedSession(overrides: Parameters<typeof aSession>[0] = {}): Postponement {
  return aSession({opponentCaptainPasswordHash: opponentPasswordHash, ...overrides});
}

function opponentApp(options: MockOptions = {}): App {
  return createApp({
    ...options,
    queries: {...options.queries, opponentCaptainPassword: OPPONENT_PASSWORD},
  });
}

async function expectForbidden(promise: Promise<Response>): Promise<void> {
  const error = await promise.catch((e: unknown) => e);
  expect(error)
    .toBeInstanceOf(AppError);
  expect((error as AppError).status)
    .toBe(403);
  expect((error as AppError).message)
    .toBe('Invalid opponent captain password.');
}

describe('opponent handlers', () => {

  describe('handleOpponentGet', () => {
    test('throws when the session does not exist', async () => {
      const app = opponentApp({params: {id: 'missing'}});

      await expect(handleOpponentGet(app))
        .rejects
        .toThrow('Session not found');
    });

    test('rejects a bare URL without the opponent-captain password', async () => {
      const session = seedSession();
      const app = createApp({params: {id: session.id}});
      await app.store.save(session);

      await expectForbidden(handleOpponentGet(app));
    });

    test('rejects a wrong opponent-captain password', async () => {
      const session = seedSession();
      const app = createApp({params: {id: session.id}, queries: {opponentCaptainPassword: 'wrong'}});
      await app.store.save(session);

      await expectForbidden(handleOpponentGet(app));
    });

    test('renders only the opponent team roster and tally, never the organizer side', async () => {
      const session = seedSession({
        homeTeam: 'Organizer Squad',
        guestTeam: 'Opponent Squad',
        players: [
          aPlayer({id: 'op', name: 'Organizer Player', teamId: 'home'}),
          aPlayer({id: 'ap', name: 'Opponent Player', teamId: 'away'}),
        ],
        proposedDates: [aProposedDate({id: 'pd-1', votable: true})],
        votes: [
          aVote({id: 'v1', proposedDateId: 'pd-1', participantId: 'op', type: 'Yes'}),
          aVote({id: 'v2', proposedDateId: 'pd-1', participantId: 'ap', type: 'No'}),
        ],
      });
      const app = opponentApp({params: {id: session.id}});
      await app.store.save(session);

      const response = await handleOpponentGet(app);
      const body = await response.text();

      expect(response.status)
        .toBe(200);
      expect(body)
        .toContain('Opponent Squad');
      expect(body)
        .toContain('Opponent Player');
      expect(body)
        .toContain('Votes team Opponent Squad: 0 (0/0/1)');
      expect(body)
        .not
        .toContain('Organizer Squad');
      expect(body)
        .not
        .toContain('Organizer Player');
    });

    test('has no propose, votable-toggle, or confirm affordance', async () => {
      const session = seedSession({proposedDates: [aProposedDate({id: 'pd-1', votable: true})]});
      const app = opponentApp({params: {id: session.id}});
      await app.store.save(session);

      const body = await (await handleOpponentGet(app)).text();

      expect(body)
        .not
        .toContain('Confirm Date');
      expect(body)
        .not
        .toContain('Add Proposed Date');
      expect(body)
        .not
        .toContain('Allow voting');
    });
  });

  describe('sort handling', () => {
    const sortDates = [
      aProposedDate({
        id: 'pd-a',
        dateTimeRange: {start: '2026-09-01T20:00', end: '2026-09-01T22:00'},
        votable: true,
      }),
      aProposedDate({
        id: 'pd-b',
        dateTimeRange: {start: '2026-09-08T20:00', end: '2026-09-08T22:00'},
        votable: true,
      }),
    ];

    test('handleOpponentGet defaults to date grouping without a sort query', async () => {
      const session = seedSession({proposedDates: sortDates});
      const app = opponentApp({params: {id: session.id}});
      await app.store.save(session);

      const html = await (await handleOpponentGet(app)).text();

      expect(html)
        .toContain('name="sort" value="date" checked');
      expect(html)
        .toContain('>Week 36<');
    });

    test('handleOpponentGet renders availability grouping when ?sort=availability', async () => {
      const session = seedSession({proposedDates: sortDates});
      const app = opponentApp({params: {id: session.id}, queries: {sort: 'availability'}});
      await app.store.save(session);

      const html = await (await handleOpponentGet(app)).text();

      expect(html)
        .toContain('name="sort" value="availability" checked');
      expect(html)
        .toContain('<span>Not playable (2)</span>');
    });

    test('handleOpponentGet treats an unknown sort value as date', async () => {
      const session = seedSession({proposedDates: sortDates});
      const app = opponentApp({params: {id: session.id}, queries: {sort: 'bogus'}});
      await app.store.save(session);

      const html = await (await handleOpponentGet(app)).text();

      expect(html)
        .toContain('name="sort" value="date" checked');
    });

    test('a mutation keeps the availability sort from the HX-Current-URL header', async () => {
      const session = seedSession({proposedDates: sortDates});
      const app = opponentApp({
        params: {id: session.id},
        queries: {proposedDateId: 'pd-a', opponentVotable: 'false'},
        headers: {
          'HX-Request': 'true',
          'HX-Current-URL': `https://game-scheduler.localhost:3000/opponent/${session.id}?opponentCaptainPassword=${OPPONENT_PASSWORD}&sort=availability`,
        },
      });
      await app.store.save(session);

      const html = await (await handleOpponentVotablePost(app)).text();

      expect(html)
        .toContain('name="sort" value="availability" checked');
      expect(html)
        .toContain('<span>Not playable (2)</span>');
    });
  });

  describe('handleOpponentPlayersPost', () => {
    test('adds a player to the opponent team, not the organizer team', async () => {
      const session = seedSession();
      const app = opponentApp({params: {id: session.id}, body: {playerName: 'Alice'}});
      await app.store.save(session);

      await handleOpponentPlayersPost(app);

      const stored = await app.store.get(session.id);
      expect(stored?.players)
        .toMatchObject([{name: 'Alice', teamId: 'away'}]);
    });

    test('removes a player and cascade-deletes their votes', async () => {
      const session = seedSession({
        players: [
          aPlayer({id: 'op', name: 'Organizer Player', teamId: 'home'}),
          aPlayer({id: 'ap', name: 'Alice', teamId: 'away'}),
        ],
        proposedDates: [aProposedDate({id: 'pd-1'})],
        votes: [
          aVote({id: 'v1', proposedDateId: 'pd-1', participantId: 'op', type: 'Yes'}),
          aVote({id: 'v2', proposedDateId: 'pd-1', participantId: 'ap', type: 'No'}),
        ],
      });
      const app = opponentApp({params: {id: session.id}, body: {playerId: 'ap'}});
      await app.store.save(session);

      await handleOpponentPlayersPost(app);

      const stored = await app.store.get(session.id);
      expect(stored?.players)
        .toMatchObject([{id: 'op', name: 'Organizer Player', teamId: 'home'}]);
      expect(stored?.votes)
        .toMatchObject([{id: 'v1', participantId: 'op'}]);
    });

    test('is a no-op when asked to remove an organizer-team player', async () => {
      const session = seedSession({
        players: [
          aPlayer({id: 'op', name: 'Organizer Player', teamId: 'home'}),
          aPlayer({id: 'ap', name: 'Alice', teamId: 'away'}),
        ],
      });
      const app = opponentApp({params: {id: session.id}, body: {playerId: 'op'}});
      await app.store.save(session);

      await handleOpponentPlayersPost(app);

      const stored = await app.store.get(session.id);
      expect(stored?.players)
        .toHaveLength(2);
    });

    test('is a no-op when asked to remove an unknown player', async () => {
      const session = seedSession({players: [aPlayer({id: 'ap', name: 'Alice', teamId: 'away'})]});
      const app = opponentApp({params: {id: session.id}, body: {playerId: 'ghost'}});
      await app.store.save(session);

      await handleOpponentPlayersPost(app);

      const stored = await app.store.get(session.id);
      expect(stored?.players)
        .toHaveLength(1);
    });

    test('redirects without adding when the name is missing', async () => {
      const session = seedSession();
      const app = opponentApp({params: {id: session.id}, body: {}});
      await app.store.save(session);

      const response = await handleOpponentPlayersPost(app);

      const stored = await app.store.get(session.id);
      expect(stored?.players)
        .toHaveLength(0);
      expect(response.status)
        .toBe(302);
      expect(response.headers.get('Location') ?? '')
        .toBe(`/opponent/${session.id}?opponentCaptainPassword=${OPPONENT_PASSWORD}`);
    });

    test('renders the inline error when partial', async () => {
      const session = seedSession();
      const app = opponentApp({params: {id: session.id}, body: {}, headers: {'HX-Request': 'true'}});
      await app.store.save(session);

      const response = await handleOpponentPlayersPost(app);
      const body = await response.text();

      expect(response.status)
        .toBe(400);
      expect(body)
        .toContain('role="alert"');
      expect(body)
        .toContain('aria-invalid="true"');
    });

    test('rejects a wrong opponent-captain password', async () => {
      const session = seedSession();
      const app = createApp({params: {id: session.id}, body: {playerName: 'Alice'}});
      await app.store.save(session);

      await expectForbidden(handleOpponentPlayersPost(app));
    });
  });

  describe('handleOpponentVotablePost', () => {
    test('turns the opponent team votable off', async () => {
      const session = seedSession({proposedDates: [aProposedDate({id: 'pd-1', votable: true, opponentVotable: true})]});
      const app = opponentApp({params: {id: session.id}, queries: {proposedDateId: 'pd-1', opponentVotable: 'false'}});
      await app.store.save(session);

      await handleOpponentVotablePost(app);

      const stored = await app.store.get(session.id);
      expect(stored?.proposedDates[0]?.opponentVotable)
        .toBe(false);
    });

    test('turns the opponent team votable back on', async () => {
      const session = seedSession({
        proposedDates: [
          aProposedDate({
            id: 'pd-1',
            votable: true,
            opponentVotable: false,
          }),
        ],
      });
      const app = opponentApp({params: {id: session.id}, queries: {proposedDateId: 'pd-1', opponentVotable: 'true'}});
      await app.store.save(session);

      await handleOpponentVotablePost(app);

      const stored = await app.store.get(session.id);
      expect(stored?.proposedDates[0]?.opponentVotable)
        .toBe(true);
    });

    test('is a no-op on a non-votable date', async () => {
      const session = seedSession({
        proposedDates: [
          aProposedDate({
            id: 'pd-1',
            votable: false,
            opponentVotable: true,
          }),
        ],
      });
      const app = opponentApp({params: {id: session.id}, queries: {proposedDateId: 'pd-1', opponentVotable: 'false'}});
      await app.store.save(session);

      await handleOpponentVotablePost(app);

      const stored = await app.store.get(session.id);
      expect(stored?.proposedDates[0]?.opponentVotable)
        .toBe(true);
    });

    test('is a no-op when the proposedDateId is missing', async () => {
      const session = seedSession({proposedDates: [aProposedDate({id: 'pd-1', votable: true, opponentVotable: true})]});
      const app = opponentApp({params: {id: session.id}, queries: {opponentVotable: 'false'}});
      await app.store.save(session);

      await handleOpponentVotablePost(app);

      const stored = await app.store.get(session.id);
      expect(stored?.proposedDates[0]?.opponentVotable)
        .toBe(true);
    });

    test('renders the page instead of redirecting (alwaysRender)', async () => {
      const session = seedSession({proposedDates: [aProposedDate({id: 'pd-1', votable: true})]});
      const app = opponentApp({params: {id: session.id}, queries: {proposedDateId: 'pd-1', opponentVotable: 'false'}});
      await app.store.save(session);

      const response = await handleOpponentVotablePost(app);

      expect(response.status)
        .toBe(200);
      expect(response.headers.get('location'))
        .toBeNull();
    });

    test('rejects a wrong opponent-captain password', async () => {
      const session = seedSession({proposedDates: [aProposedDate({id: 'pd-1'})]});
      const app = createApp({params: {id: session.id}, queries: {proposedDateId: 'pd-1', opponentVotable: 'false'}});
      await app.store.save(session);

      await expectForbidden(handleOpponentVotablePost(app));
    });
  });

  describe('handleOpponentAcceptedPost', () => {
    test('marks a date accepted', async () => {
      const session = seedSession({proposedDates: [aProposedDate({id: 'pd-1', votable: true, accepted: false})]});
      const app = opponentApp({params: {id: session.id}, queries: {proposedDateId: 'pd-1', accepted: 'true'}});
      await app.store.save(session);

      await handleOpponentAcceptedPost(app);

      const stored = await app.store.get(session.id);
      expect(stored?.proposedDates[0]?.accepted)
        .toBe(true);
    });

    test('un-marks a date accepted', async () => {
      const session = seedSession({proposedDates: [aProposedDate({id: 'pd-1', votable: true, accepted: true})]});
      const app = opponentApp({params: {id: session.id}, queries: {proposedDateId: 'pd-1', accepted: 'false'}});
      await app.store.save(session);

      await handleOpponentAcceptedPost(app);

      const stored = await app.store.get(session.id);
      expect(stored?.proposedDates[0]?.accepted)
        .toBe(false);
    });

    test('is a no-op when the proposedDateId is missing', async () => {
      const session = seedSession({proposedDates: [aProposedDate({id: 'pd-1', votable: true, accepted: false})]});
      const app = opponentApp({params: {id: session.id}, queries: {accepted: 'true'}});
      await app.store.save(session);

      await handleOpponentAcceptedPost(app);

      const stored = await app.store.get(session.id);
      expect(stored?.proposedDates[0]?.accepted)
        .toBe(false);
    });

    test('rejects a wrong opponent-captain password', async () => {
      const session = seedSession({proposedDates: [aProposedDate({id: 'pd-1'})]});
      const app = createApp({params: {id: session.id}, queries: {proposedDateId: 'pd-1', accepted: 'true'}});
      await app.store.save(session);

      await expectForbidden(handleOpponentAcceptedPost(app));
    });
  });

  describe('handleOpponentRefreshPost', () => {
    const identities = {
      home: {championship: 'MTTV 26/27', group: '219397', teamtable: '1732195'},
      away: {championship: 'MTTV 26/27', group: '219397', teamtable: '1732193'},
    };

    beforeEach(() => {
      mockFetchMatches.mockReset();
      mockFetchClubMeetings.mockReset();
    });

    function checkedSession(): Postponement {
      return seedSession({
        homeTeam: 'Home Team',
        guestTeam: 'Guest Team',
        homeTeamIdentity: identities.home,
        guestTeamIdentity: identities.away,
        proposedDates: [
          aProposedDate({
            id: 'pd-1',
            clashes: {
              home: [{opponent: 'Old Home Opp', start: '2025-09-01T08:00'}],
              away: [{opponent: 'Old Away Opp', start: '2025-09-01T08:00'}],
            },
          }),
        ],
      });
    }

    test('rejects a wrong opponent-captain password', async () => {
      const session = checkedSession();
      const app = createApp({params: {id: session.id}, queries: {opponentCaptainPassword: 'wrong'}});
      await app.store.save(session);

      await expectForbidden(handleOpponentRefreshPost(app));
    });

    test('scrapes only the opponent side, replaces its lines, and preserves the organizer side byte-identical', async () => {
      const session = checkedSession();
      mockFetchMatches.mockResolvedValue([
        {day: 'Mo', date: '01.09.2025', time: '19:00', homeTeam: 'Home Team', guestTeam: 'Guest Team'},
      ]);
      const app = opponentApp({params: {id: session.id}, headers: {'HX-Request': 'true'}});
      await app.store.save(session);
      const saveSpy = vi.spyOn(app.store, 'save');

      const response = await handleOpponentRefreshPost(app);
      const html = await response.text();

      expect(mockFetchMatches)
        .toHaveBeenCalledTimes(1);
      expect(mockFetchMatches)
        .toHaveBeenCalledWith('MTTV 26/27', '219397', '1732193');
      const stored = await app.store.get(session.id);
      expect(stored?.proposedDates[0]?.clashes?.home)
        .toEqual([{opponent: 'Old Home Opp', start: '2025-09-01T08:00'}]);
      expect(stored?.proposedDates[0]?.clashes?.away)
        .toEqual([{opponent: 'Home Team', start: '2025-09-01T19:00'}]);
      expect(saveSpy)
        .toHaveBeenCalledTimes(1);
      // The opponent partial re-renders with the fresh own-side line and the
      // reused success announcement, without a failure notice.
      expect(response.status)
        .toBe(200);
      expect(html)
        .toContain('id="opponent-view"');
      expect(html)
        .toContain('7:00 PM vs Home Team');
      expect(html)
        .not
        .toContain('Old Away Opp');
      expect(html)
        .not
        .toContain('showing the previous results');
      expect(html)
        .toContain('<p id="clipboard-status" class="visually-hidden" role="status" hx-swap-oob="true">Schedule check refreshed</p>');
    });

    test('never flips the symmetric votable switch', async () => {
      const session = seedSession({
        homeTeam: 'Home Team',
        guestTeam: 'Guest Team',
        homeTeamIdentity: identities.home,
        guestTeamIdentity: identities.away,
        proposedDates: [
          aProposedDate({id: 'pd-open', votable: true, clashes: {home: [], away: []}}),
          aProposedDate({id: 'pd-closed', votable: false, clashes: {home: [], away: []}}),
        ],
      });
      mockFetchMatches.mockResolvedValue([
        {day: 'Mo', date: '01.09.2025', time: '19:00', homeTeam: 'Home Team', guestTeam: 'Guest Team'},
      ]);
      const app = opponentApp({params: {id: session.id}, headers: {'HX-Request': 'true'}});
      await app.store.save(session);

      await handleOpponentRefreshPost(app);

      const stored = await app.store.get(session.id);
      expect(stored?.proposedDates)
        .toMatchObject([{id: 'pd-open', votable: true}, {id: 'pd-closed', votable: false}]);
    });

    test('a failed refresh keeps the previous snapshot and renders the warning without a write', async () => {
      const session = checkedSession();
      mockFetchMatches.mockRejectedValue(new ClickTTError('click-tt is down'));
      const app = opponentApp({params: {id: session.id}, headers: {'HX-Request': 'true'}});
      await app.store.save(session);
      const saveSpy = vi.spyOn(app.store, 'save');

      const html = await (await handleOpponentRefreshPost(app)).text();

      const stored = await app.store.get(session.id);
      expect(stored?.proposedDates[0]?.clashes)
        .toEqual({
          home: [{opponent: 'Old Home Opp', start: '2025-09-01T08:00'}],
          away: [{opponent: 'Old Away Opp', start: '2025-09-01T08:00'}],
        });
      // The command seam only writes a changed session; keeping the stale
      // snapshot is a no-op.
      expect(saveSpy)
        .not
        .toHaveBeenCalled();
      // The stale snapshot still renders, with the reused failure notice and
      // no success announcement.
      expect(html)
        .toContain('8:00 AM vs Old Away Opp');
      expect(html)
        .toContain('showing the previous results');
      expect(html)
        .not
        .toContain('Schedule check refreshed');
    });

    test('first check fails: no snapshot existed, so the plain nothing state renders', async () => {
      const session = seedSession({
        homeTeam: 'Home Team',
        guestTeam: 'Guest Team',
        homeTeamIdentity: identities.home,
        guestTeamIdentity: identities.away,
        proposedDates: [aProposedDate({id: 'pd-1'})],
      });
      mockFetchMatches.mockRejectedValue(new ClickTTError('click-tt is down'));
      const app = opponentApp({params: {id: session.id}, headers: {'HX-Request': 'true'}});
      await app.store.save(session);

      const html = await (await handleOpponentRefreshPost(app)).text();

      expect(html)
        .not
        .toContain('showing the previous results');
      expect(html)
        .not
        .toContain('Schedule check refreshed');
      expect(html)
        .not
        .toContain('date-chips');
    });

    test('without an opponent-side identity nothing is fetched and the session is untouched', async () => {
      const session = checkedSession();
      session.guestTeamIdentity = undefined;
      const app = opponentApp({params: {id: session.id}, headers: {'HX-Request': 'true'}});
      await app.store.save(session);
      const saveSpy = vi.spyOn(app.store, 'save');

      const html = await (await handleOpponentRefreshPost(app)).text();

      expect(mockFetchMatches)
        .not
        .toHaveBeenCalled();
      expect(saveSpy)
        .not
        .toHaveBeenCalled();
      expect(html)
        .toContain('showing the previous results');
    });

    test('on the home side the occupancy snapshot is re-fetched alongside the clashes', async () => {
      const session = seedSession({
        organizerTeam: 'away',
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
      const app = opponentApp({params: {id: session.id}, headers: {'HX-Request': 'true'}});
      await app.store.save(session);

      await handleOpponentRefreshPost(app);

      expect(mockFetchMatches)
        .toHaveBeenCalledTimes(1);
      expect(mockFetchMatches)
        .toHaveBeenCalledWith('MTTV 26/27', '219397', '1732195');
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
    });

    test('on the home side a failed occupancy fetch preserves the previous occupancy', async () => {
      const session = seedSession({
        organizerTeam: 'away',
        homeTeam: 'Home Team',
        guestTeam: 'Guest Team',
        clubId: '33282',
        homeTeamIdentity: identities.home,
        guestTeamIdentity: identities.away,
        proposedDates: [
          aProposedDate({
            id: 'pd-1',
            clashes: {home: [], away: []},
            venueOccupancy: {count: 2, matches: [{opponent: 'Old Hall Opp', start: '2025-09-01T19:30'}]},
          }),
        ],
      });
      mockFetchMatches.mockResolvedValue([]);
      mockFetchClubMeetings.mockRejectedValue(new ClickTTError('click-tt is down'));
      const app = opponentApp({params: {id: session.id}, headers: {'HX-Request': 'true'}});
      await app.store.save(session);

      const html = await (await handleOpponentRefreshPost(app)).text();

      const stored = await app.store.get(session.id);
      expect(stored?.proposedDates[0]?.venueOccupancy)
        .toEqual({count: 2, matches: [{opponent: 'Old Hall Opp', start: '2025-09-01T19:30'}]});
      // The team scrape succeeded, so the refresh still announces success.
      expect(html)
        .toContain('Schedule check refreshed');
    });

    test('on the away side occupancy is left untouched and never fetched', async () => {
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
            venueOccupancy: {count: 2, matches: [{opponent: 'Old Hall Opp', start: '2025-09-01T19:30'}]},
          }),
        ],
      });
      mockFetchMatches.mockResolvedValue([]);
      const app = opponentApp({params: {id: session.id}, headers: {'HX-Request': 'true'}});
      await app.store.save(session);

      await handleOpponentRefreshPost(app);

      expect(mockFetchClubMeetings)
        .not
        .toHaveBeenCalled();
      const stored = await app.store.get(session.id);
      expect(stored?.proposedDates[0]?.venueOccupancy)
        .toEqual({count: 2, matches: [{opponent: 'Old Hall Opp', start: '2025-09-01T19:30'}]});
    });
  });

});
