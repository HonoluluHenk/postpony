import { describe, expect, test, vi } from 'vitest';
import { App } from '../../app';
import { aPlayer, aProposedDate, aSession, aVote } from '../../lib/__test-utils__/builders';
import { hashPassword } from '../../lib/crypto-utils';
import { LOCALE_KEY } from '../../locales';
import { MemorySessionStore } from '../../lib/session-store';
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
    html: vi.fn((content: string) => new Response(content)),
    redirect: vi.fn((url: string) => new Response(null, {status: 302, headers: {Location: url}})),
  } as any;

  return App.create(context, store);
}

async function seedSession(overrides: Parameters<typeof aSession>[0] = {}): Promise<ReturnType<typeof aSession>> {
  return aSession({invitationPasswordHash: await hashPassword(TOKEN), ...overrides});
}

describe('join handlers', () => {

  describe('handleJoinGet', () => {
    test('throws when the session does not exist', async () => {
      const app = createApp({params: {id: 'missing', team: 'home'}, queries: {token: TOKEN}});

      await expect(handleJoinGet(app))
        .rejects
        .toThrow('Session not found');
    });

    test('throws when the token is missing', async () => {
      const session = await seedSession();
      const app = createApp({params: {id: session.id, team: 'home'}});
      await app.store.save(session);

      await expect(handleJoinGet(app))
        .rejects
        .toThrow('Invalid or missing invitation token.');
    });

    test('throws when the token is wrong', async () => {
      const session = await seedSession();
      const app = createApp({params: {id: session.id, team: 'home'}, queries: {token: 'nope'}});
      await app.store.save(session);

      await expect(handleJoinGet(app))
        .rejects
        .toThrow('Invalid or missing invitation token.');
    });

    test('throws when the team parameter is invalid', async () => {
      const session = await seedSession();
      const app = createApp({params: {id: session.id, team: 'spectators'}, queries: {token: TOKEN}});
      await app.store.save(session);

      await expect(handleJoinGet(app))
        .rejects
        .toThrow('Invalid team. Expected \'home\' or \'away\'.');
    });

    test('renders the join page for a valid token and team', async () => {
      const session = await seedSession({players: [aPlayer({name: 'Alice'})]});
      const app = createApp({params: {id: session.id, team: 'home'}, queries: {token: TOKEN}});
      await app.store.save(session);

      const response = await handleJoinGet(app);
      const body = await response.text();

      expect(response.status)
        .toBe(200);
      expect(body)
        .toContain('Join the Postponement');
      expect(body)
        .toContain('Select your name');
      expect(body)
        .toContain('name="playerId" value="player-1"');
      expect(body)
        .toContain('Alice');
      expect(body)
        .toContain(`action="/join/${session.id}/home/register?token=${TOKEN}"`);
      expect(body)
        .toContain(`postpony-player-${session.id}-home`);
    });
  });

  describe('handleJoinRegisterPost', () => {
    test('creates a new player for the given team and redirects to the vote step', async () => {
      const session = await seedSession();
      const app = createApp({
        params: {id: session.id, team: 'away'},
        queries: {token: TOKEN},
        body: {newPlayerName: 'Alice'},
      });
      await app.store.save(session);

      const response = await handleJoinRegisterPost(app);

      const stored = await app.store.get(session.id);
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
      const session = await seedSession({players: [existing]});
      const app = createApp({
        params: {id: session.id, team: 'away'},
        queries: {token: TOKEN},
        body: {newPlayerName: 'bob'},
      });
      await app.store.save(session);

      const response = await handleJoinRegisterPost(app);

      const stored = await app.store.get(session.id);
      expect(stored?.players)
        .toHaveLength(1);
      expect(response.headers.get('Location') ?? '')
        .toContain('playerId=away-1');
    });

    test('selects an existing player by id', async () => {
      const existing = aPlayer({id: 'home-1', name: 'Carol', teamId: 'home'});
      const session = await seedSession({players: [existing]});
      const app = createApp({
        params: {id: session.id, team: 'home'},
        queries: {token: TOKEN},
        body: {playerId: 'home-1'},
      });
      await app.store.save(session);

      const response = await handleJoinRegisterPost(app);

      const stored = await app.store.get(session.id);
      expect(stored?.players)
        .toHaveLength(1);
      expect(response.headers.get('Location') ?? '')
        .toContain('playerId=home-1');
    });

    test('returns the join form with an inline error when neither a name nor a selection is provided', async () => {
      const session = await seedSession();
      const app = createApp({
        params: {id: session.id, team: 'home'},
        queries: {token: TOKEN},
        body: {},
      });
      await app.store.save(session);

      const response = await handleJoinRegisterPost(app);
      const body = await response.text();

      expect(response.status)
        .toBe(200);
      expect(body)
        .toContain('Please select your name or enter a new one.');
      expect(body)
        .toContain('role="alert"');
      expect(body)
        .toContain('aria-invalid="true"');
    });

    test('blocks registration when the session is Confirmed and redirects to the confirmed view', async () => {
      const session = await seedSession({status: 'Confirmed'});
      const app = createApp({
        params: {id: session.id, team: 'away'},
        queries: {token: TOKEN},
        body: {newPlayerName: 'Alice'},
      });
      await app.store.save(session);

      const response = await handleJoinRegisterPost(app);

      const stored = await app.store.get(session.id);
      expect(stored?.players)
        .toHaveLength(0);
      expect(response.status)
        .toBe(302);
      expect(response.headers.get('Location') ?? '')
        .toContain(`/join/${session.id}/away`);
    });

    test('allows registration when the session is Draft (pre-proposal)', async () => {
      const session = await seedSession({status: 'Draft'});
      const app = createApp({
        params: {id: session.id, team: 'away'},
        queries: {token: TOKEN},
        body: {newPlayerName: 'Alice'},
      });
      await app.store.save(session);

      const response = await handleJoinRegisterPost(app);

      const stored = await app.store.get(session.id);
      expect(stored?.players)
        .toHaveLength(1);
      expect(response.status)
        .toBe(302);
    });

    test('throws when the token is wrong', async () => {
      const session = await seedSession();
      const app = createApp({
        params: {id: session.id, team: 'home'},
        queries: {token: 'nope'},
        body: {newPlayerName: 'Alice'},
      });
      await app.store.save(session);

      await expect(handleJoinRegisterPost(app))
        .rejects
        .toThrow('Invalid or missing invitation token.');
    });
  });

  describe('handleJoinVoteGet', () => {
    test('renders the vote step for an identified player', async () => {
      const session = await seedSession({
        players: [aPlayer()],
        proposedDates: [aProposedDate()],
      });
      const app = createApp({
        params: {id: session.id, team: 'home'},
        queries: {token: TOKEN, playerId: 'player-1'},
      });
      await app.store.save(session);

      const response = await handleJoinVoteGet(app);

      expect(response.status)
        .toBe(200);
    });

    test('redirects to step 1 when the player is unknown', async () => {
      const session = await seedSession({proposedDates: [aProposedDate()]});
      const app = createApp({
        params: {id: session.id, team: 'home'},
        queries: {token: TOKEN, playerId: 'ghost'},
      });
      await app.store.save(session);

      const response = await handleJoinVoteGet(app);

      expect(response.status)
        .toBe(302);
      expect(response.headers.get('Location') ?? '')
        .toContain(`/join/${session.id}/home`);
    });

    test('renders the pre-proposal empty-state hint for an away team with no votable dates', async () => {
      const session = await seedSession({
        status: 'Draft',
        players: [aPlayer({teamId: 'away'})],
        proposedDates: [aProposedDate({votableByOpponent: false})],
      });
      const app = createApp({
        params: {id: session.id, team: 'away'},
        queries: {token: TOKEN, playerId: 'player-1'},
      });
      await app.store.save(session);

      const response = await handleJoinVoteGet(app);
      const body = await response.text();

      expect(response.status)
        .toBe(200);
      expect(body)
        .toContain('No dates have been proposed yet');
      expect(body)
        .not
        .toContain('name="vote-');
      expect(body)
        .not
        .toContain("Your Team's Votes");
    });

    test('renders the confirmed-info view on the vote route when the session is Confirmed', async () => {
      const session = await seedSession({
        status: 'Confirmed',
        confirmedProposedDateId: 'proposed-date-1',
        reopenCount: 1,
        players: [aPlayer()],
        proposedDates: [aProposedDate()],
      });
      const app = createApp({
        params: {id: session.id, team: 'home'},
        queries: {token: TOKEN, playerId: 'player-1'},
      });
      await app.store.save(session);

      const response = await handleJoinVoteGet(app);
      const body = await response.text();

      expect(response.status)
        .toBe(200);
      expect(body)
        .toContain('Voting is closed');
      expect(body)
        .toContain('Sep 1, 2025');
      expect(body)
        .toContain('Reopened');
      expect(body)
        .not
        .toContain('name="vote-');
      expect(body)
        .not
        .toContain("Your Team's Votes");
    });

    test('renders the confirmed-info view on the join route when the session is Confirmed', async () => {
      const session = await seedSession({
        status: 'Confirmed',
        confirmedProposedDateId: 'proposed-date-1',
        proposedDates: [aProposedDate()],
      });
      const app = createApp({
        params: {id: session.id, team: 'home'},
        queries: {token: TOKEN},
      });
      await app.store.save(session);

      const response = await handleJoinGet(app);
      const body = await response.text();

      expect(response.status)
        .toBe(200);
      expect(body)
        .toContain('Voting is closed');
      expect(body)
        .not
        .toContain('join_select_player');
      expect(body)
        .not
        .toContain('name="newPlayerName"');
    });
  });

  describe('handleJoinVotePost', () => {
    test('stores a new vote for each proposed date', async () => {
      const session = await seedSession({
        players: [aPlayer()],
        proposedDates: [aProposedDate()],
      });
      const app = createApp({
        params: {id: session.id, team: 'home'},
        queries: {token: TOKEN, playerId: 'player-1'},
        body: {'vote-proposed-date-1': 'Yes'},
      });
      await app.store.save(session);

      const response = await handleJoinVotePost(app);

      const stored = await app.store.get(session.id);
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
      const session = await seedSession({
        players: [aPlayer()],
        proposedDates: [aProposedDate()],
        votes: [aVote({participantId: 'player-1', proposedDateId: 'proposed-date-1', type: 'Yes'})],
      });
      const app = createApp({
        params: {id: session.id, team: 'home'},
        queries: {token: TOKEN, playerId: 'player-1'},
        body: {'vote-proposed-date-1': 'No'},
      });
      await app.store.save(session);

      await handleJoinVotePost(app);

      const stored = await app.store.get(session.id);
      expect(stored?.votes)
        .toHaveLength(1);
      expect(stored?.votes[0]?.type)
        .toBe('No');
    });

    test('does not change votes when the session is confirmed', async () => {
      const session = await seedSession({
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
      await app.store.save(session);

      const response = await handleJoinVotePost(app);

      const stored = await app.store.get(session.id);
      expect(stored?.votes)
        .toHaveLength(1);
      expect(stored?.votes[0]?.type)
        .toBe('Yes');
      expect(response.status)
        .toBe(200);
      expect(await response.text())
        .toContain('Voting is closed');
    });
  });

});
