import { describe, expect, test, vi } from 'vitest';
import { App } from '../../app';
import { aPlayer, aProposedDate, aSession, aVote } from '../../lib/__test-utils__/builders';
import { hashPassword } from '../../lib/crypto-utils';
import { LOCALE_KEY } from '../../locales';
import { handleJoinGet } from './join-get';
import { handleJoinRegisterPost } from './join-register-post';
import { handleJoinVoteGet } from './join-vote-get';
import { handleJoinVotePost } from './join-vote-post';

const TOKEN = 'invitation-pw';

interface MockOptions {
  params?: Record<string, string>;
  queries?: Record<string, string>;
  headers?: Record<string, string>;
  body?: Record<string, unknown>;
}

function createApp(options: MockOptions = {}): App {
  const {params = {}, queries = {}, headers = {}, body = {}} = options;
  const context = {
    get: (key: string): string | undefined => (key === LOCALE_KEY ? 'en' : undefined),
    req: {
      param: (name: string): string | undefined => params[name],
      query: (name: string): string | undefined => queries[name],
      header: (name: string): string | undefined => headers[name],
      parseBody: (): Promise<Record<string, unknown>> => Promise.resolve(body),
      url: 'https://game-scheduler.localhost:3000/',
    },
    html: vi.fn((content: string) => new Response(content)),
    redirect: vi.fn((url: string) => new Response(null, {status: 302, headers: {Location: url}})),
  } as any;

  return App.create(context);
}

function seedSession(overrides: Parameters<typeof aSession>[0] = {}): ReturnType<typeof aSession> {
  return aSession({invitationPasswordHash: hashPassword(TOKEN), ...overrides});
}

describe('join handlers', () => {

  describe('handleJoinGet', () => {
    test('throws when the session does not exist', () => {
      const app = createApp({params: {id: 'missing', team: 'home'}, queries: {token: TOKEN}});

      expect(() => handleJoinGet(app))
        .toThrow('Session not found');
    });

    test('throws when the token is missing', () => {
      const session = seedSession();
      const app = createApp({params: {id: session.id, team: 'home'}});
      app.sessions[session.id] = session;

      expect(() => handleJoinGet(app))
        .toThrow('Invalid or missing invitation token.');
    });

    test('throws when the token is wrong', () => {
      const session = seedSession();
      const app = createApp({params: {id: session.id, team: 'home'}, queries: {token: 'nope'}});
      app.sessions[session.id] = session;

      expect(() => handleJoinGet(app))
        .toThrow('Invalid or missing invitation token.');
    });

    test('throws when the team parameter is invalid', () => {
      const session = seedSession();
      const app = createApp({params: {id: session.id, team: 'spectators'}, queries: {token: TOKEN}});
      app.sessions[session.id] = session;

      expect(() => handleJoinGet(app))
        .toThrow('Invalid team. Expected \'home\' or \'away\'.');
    });

    test('renders the join page for a valid token and team', () => {
      const session = seedSession({players: [aPlayer({name: 'Alice'})]});
      const app = createApp({params: {id: session.id, team: 'home'}, queries: {token: TOKEN}});
      app.sessions[session.id] = session;

      const response = handleJoinGet(app);

      expect(response.status)
        .toBe(200);
    });
  });

  describe('handleJoinRegisterPost', () => {
    test('creates a new player for the given team and redirects to the vote step', async () => {
      const session = seedSession();
      const app = createApp({
        params: {id: session.id, team: 'away'},
        queries: {token: TOKEN},
        body: {newPlayerName: 'Alice'},
      });
      app.sessions[session.id] = session;

      const response = await handleJoinRegisterPost(app);

      const stored = app.sessions[session.id];
      expect(stored?.players)
        .toHaveLength(1);
      expect(stored?.players[0]?.name)
        .toBe('Alice');
      expect(stored?.players[0]?.teamId)
        .toBe('away');
      expect(response.status)
        .toBe(302);
      const location = response.headers.get('Location') ?? '';
      expect(location)
        .toContain(`playerId=${stored?.players[0]?.id ?? ''}`);
      expect(location)
        .toContain(`token=${TOKEN}`);
    });

    test('selects an existing player by name without creating a duplicate', async () => {
      const existing = aPlayer({id: 'away-1', name: 'Bob', teamId: 'away'});
      const session = seedSession({players: [existing]});
      const app = createApp({
        params: {id: session.id, team: 'away'},
        queries: {token: TOKEN},
        body: {newPlayerName: 'bob'},
      });
      app.sessions[session.id] = session;

      const response = await handleJoinRegisterPost(app);

      expect(app.sessions[session.id]?.players)
        .toHaveLength(1);
      expect(response.headers.get('Location') ?? '')
        .toContain('playerId=away-1');
    });

    test('selects an existing player by id', async () => {
      const existing = aPlayer({id: 'home-1', name: 'Carol', teamId: 'home'});
      const session = seedSession({players: [existing]});
      const app = createApp({
        params: {id: session.id, team: 'home'},
        queries: {token: TOKEN},
        body: {playerId: 'home-1'},
      });
      app.sessions[session.id] = session;

      const response = await handleJoinRegisterPost(app);

      expect(app.sessions[session.id]?.players)
        .toHaveLength(1);
      expect(response.headers.get('Location') ?? '')
        .toContain('playerId=home-1');
    });

    test('throws when neither a name nor a selection is provided', async () => {
      const session = seedSession();
      const app = createApp({
        params: {id: session.id, team: 'home'},
        queries: {token: TOKEN},
        body: {},
      });
      app.sessions[session.id] = session;

      await expect(handleJoinRegisterPost(app))
        .rejects
        .toThrow('Please select your name or enter a new one.');
    });

    test('throws when the token is wrong', async () => {
      const session = seedSession();
      const app = createApp({
        params: {id: session.id, team: 'home'},
        queries: {token: 'nope'},
        body: {newPlayerName: 'Alice'},
      });
      app.sessions[session.id] = session;

      await expect(handleJoinRegisterPost(app))
        .rejects
        .toThrow('Invalid or missing invitation token.');
    });
  });

  describe('handleJoinVoteGet', () => {
    test('renders the vote step for an identified player', () => {
      const session = seedSession({
        players: [aPlayer()],
        proposedDates: [aProposedDate()],
      });
      const app = createApp({
        params: {id: session.id, team: 'home'},
        queries: {token: TOKEN, playerId: 'player-1'},
      });
      app.sessions[session.id] = session;

      const response = handleJoinVoteGet(app);

      expect(response.status)
        .toBe(200);
    });

    test('redirects to step 1 when the player is unknown', () => {
      const session = seedSession({proposedDates: [aProposedDate()]});
      const app = createApp({
        params: {id: session.id, team: 'home'},
        queries: {token: TOKEN, playerId: 'ghost'},
      });
      app.sessions[session.id] = session;

      const response = handleJoinVoteGet(app);

      expect(response.status)
        .toBe(302);
      expect(response.headers.get('Location') ?? '')
        .toContain(`/join/${session.id}/home`);
    });
  });

  describe('handleJoinVotePost', () => {
    test('stores a new vote for each proposed date', async () => {
      const session = seedSession({
        players: [aPlayer()],
        proposedDates: [aProposedDate()],
      });
      const app = createApp({
        params: {id: session.id, team: 'home'},
        queries: {token: TOKEN, playerId: 'player-1'},
        body: {'vote-proposed-date-1': 'Yes'},
      });
      app.sessions[session.id] = session;

      const response = await handleJoinVotePost(app);

      const stored = app.sessions[session.id];
      expect(stored?.votes)
        .toHaveLength(1);
      expect(stored?.votes[0]?.type)
        .toBe('Yes');
      expect(stored?.votes[0]?.proposedDateId)
        .toBe('proposed-date-1');
      expect(stored?.votes[0]?.participantId)
        .toBe('player-1');
      expect(response.status)
        .toBe(200);
    });

    test('updates an existing vote instead of duplicating it', async () => {
      const session = seedSession({
        players: [aPlayer()],
        proposedDates: [aProposedDate()],
        votes: [aVote({participantId: 'player-1', proposedDateId: 'proposed-date-1', type: 'Yes'})],
      });
      const app = createApp({
        params: {id: session.id, team: 'home'},
        queries: {token: TOKEN, playerId: 'player-1'},
        body: {'vote-proposed-date-1': 'No'},
      });
      app.sessions[session.id] = session;

      await handleJoinVotePost(app);

      const stored = app.sessions[session.id];
      expect(stored?.votes)
        .toHaveLength(1);
      expect(stored?.votes[0]?.type)
        .toBe('No');
    });

    test('does not change votes when the session is confirmed', async () => {
      const session = seedSession({
        status: 'Confirmed',
        players: [aPlayer()],
        proposedDates: [aProposedDate()],
        votes: [aVote({participantId: 'player-1', proposedDateId: 'proposed-date-1', type: 'Yes'})],
      });
      const app = createApp({
        params: {id: session.id, team: 'home'},
        queries: {token: TOKEN, playerId: 'player-1'},
        body: {'vote-proposed-date-1': 'No'},
      });
      app.sessions[session.id] = session;

      const response = await handleJoinVotePost(app);

      const stored = app.sessions[session.id];
      expect(stored?.votes)
        .toHaveLength(1);
      expect(stored?.votes[0]?.type)
        .toBe('Yes');
      expect(response.status)
        .toBe(200);
    });
  });

});
