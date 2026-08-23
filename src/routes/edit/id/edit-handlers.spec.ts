import { describe, expect, test, vi } from 'vitest';
import { App } from '../../../app';
import { aPlayer, aProposedDate, aSession, aVote } from '../../../lib/__test-utils__/builders';
import { LOCALE_KEY } from '../../../locales';
import { MemorySessionStore } from '../../../lib/session-store';
import { buildOwnTeamView } from './own-team-view';
import { handleConfirmDatePost } from './confirm-date-post';
import { handleEditPlayersPost } from './players-post';
import { handleEditProposedDatesPost } from './proposed-dates-post';
import { handleProposedDateDeletePost } from './proposed-date-delete-post';
import { handleReopenPost } from './reopen-post';

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

describe('edit handlers', () => {

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
      expect(stored?.players)
        .toHaveLength(2);
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
      expect(stored?.proposedDates)
        .toHaveLength(2);
    });

    test('moves a Draft session to Voting when the first date is added', async () => {
      const session = aSession();
      const app = createApp({params: {id: session.id}, body: {proposedDateTime: '09/01/2025 08:00 pm'}});
      await app.store.save(session);

      await handleEditProposedDatesPost(app);

      const stored = await app.store.get(session.id);
      expect(stored?.status)
        .toBe('Voting');
      expect(stored?.proposedDates[0]?.votableByOpponent)
        .toBe(false);
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
        .toContain('<section id="own-team-votes" class="padding small-round surface-variant" hx-swap-oob="true"');
      expect(html)
        .not
        .toContain('error padding white-text');
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
        proposedDates: [aProposedDate({id: 'pd-1', votableByOpponent: true})],
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

    test('is a no-op for a date that is not votable by the opponent', async () => {
      const session = aSession({
        status: 'Voting',
        proposedDates: [aProposedDate({id: 'pd-1', votableByOpponent: false})],
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
        proposedDates: [aProposedDate({id: 'pd-1', votableByOpponent: true})],
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

    test('renders the partial with the reopen control and no confirm control when partial', async () => {
      const session = aSession({
        status: 'Voting',
        proposedDates: [aProposedDate({id: 'pd-1', votableByOpponent: true})],
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
        proposedDates: [aProposedDate({id: 'pd-1', votableByOpponent: true})],
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
          aProposedDate({id: 'pd-1', votableByOpponent: true}),
          aProposedDate({id: 'pd-2', votableByOpponent: false}),
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
          aProposedDate({id: 'pd-1', votableByOpponent: true}),
          aProposedDate({id: 'pd-2', votableByOpponent: false}),
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
        proposedDates: [aProposedDate({id: 'pd-1', votableByOpponent: true})],
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
        proposedDates: [aProposedDate({id: 'pd-1', votableByOpponent: true})],
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

      expect(view.organizerPlayers)
        .toHaveLength(1);
      expect(view.ownTeamResults)
        .toEqual([]);
    });
  });

});
