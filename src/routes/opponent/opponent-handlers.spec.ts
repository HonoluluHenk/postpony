import { describe, expect, test } from 'vitest';
import type { App } from '../../app';
import { aPlayer, aProposedDate, aSession, aVote } from '../../lib/__test-utils__/builders';
import { createApp, type MockOptions } from '../../lib/__test-utils__/create-app';
import { hashPassword } from '../../lib/crypto-utils';
import { AppError } from '../../lib/errors';
import type { Postponement } from '../../lib/models';
import { handleOpponentAcceptablePost } from './acceptable-post';
import { handleOpponentGet } from './opponent-get';
import { handleOpponentPlayersPost } from './players-post';
import { handleOpponentVetoPost } from './veto-post';

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
        .toContain('Opponent Squad: 0 (0/0/1)');
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

  describe('handleOpponentVetoPost', () => {
    test('vetoes a votable date', async () => {
      const session = seedSession({proposedDates: [aProposedDate({id: 'pd-1', votable: true, vetoed: false})]});
      const app = opponentApp({params: {id: session.id}, queries: {proposedDateId: 'pd-1', vetoed: 'true'}});
      await app.store.save(session);

      await handleOpponentVetoPost(app);

      const stored = await app.store.get(session.id);
      expect(stored?.proposedDates[0]?.vetoed)
        .toBe(true);
    });

    test('un-vetoes a votable date', async () => {
      const session = seedSession({proposedDates: [aProposedDate({id: 'pd-1', votable: true, vetoed: true})]});
      const app = opponentApp({params: {id: session.id}, queries: {proposedDateId: 'pd-1', vetoed: 'false'}});
      await app.store.save(session);

      await handleOpponentVetoPost(app);

      const stored = await app.store.get(session.id);
      expect(stored?.proposedDates[0]?.vetoed)
        .toBe(false);
    });

    test('is a no-op on a non-votable date', async () => {
      const session = seedSession({proposedDates: [aProposedDate({id: 'pd-1', votable: false, vetoed: false})]});
      const app = opponentApp({params: {id: session.id}, queries: {proposedDateId: 'pd-1', vetoed: 'true'}});
      await app.store.save(session);

      await handleOpponentVetoPost(app);

      const stored = await app.store.get(session.id);
      expect(stored?.proposedDates[0]?.vetoed)
        .toBe(false);
    });

    test('is a no-op when the proposedDateId is missing', async () => {
      const session = seedSession({proposedDates: [aProposedDate({id: 'pd-1', votable: true, vetoed: false})]});
      const app = opponentApp({params: {id: session.id}, queries: {vetoed: 'true'}});
      await app.store.save(session);

      await handleOpponentVetoPost(app);

      const stored = await app.store.get(session.id);
      expect(stored?.proposedDates[0]?.vetoed)
        .toBe(false);
    });

    test('renders the page instead of redirecting (alwaysRender)', async () => {
      const session = seedSession({proposedDates: [aProposedDate({id: 'pd-1', votable: true})]});
      const app = opponentApp({params: {id: session.id}, queries: {proposedDateId: 'pd-1', vetoed: 'true'}});
      await app.store.save(session);

      const response = await handleOpponentVetoPost(app);

      expect(response.status)
        .toBe(200);
      expect(response.headers.get('location'))
        .toBeNull();
    });

    test('rejects a wrong opponent-captain password', async () => {
      const session = seedSession({proposedDates: [aProposedDate({id: 'pd-1'})]});
      const app = createApp({params: {id: session.id}, queries: {proposedDateId: 'pd-1', vetoed: 'true'}});
      await app.store.save(session);

      await expectForbidden(handleOpponentVetoPost(app));
    });
  });

  describe('handleOpponentAcceptablePost', () => {
    test('marks a date acceptable', async () => {
      const session = seedSession({proposedDates: [aProposedDate({id: 'pd-1', votable: true, acceptable: false})]});
      const app = opponentApp({params: {id: session.id}, queries: {proposedDateId: 'pd-1', acceptable: 'true'}});
      await app.store.save(session);

      await handleOpponentAcceptablePost(app);

      const stored = await app.store.get(session.id);
      expect(stored?.proposedDates[0]?.acceptable)
        .toBe(true);
    });

    test('un-marks a date acceptable', async () => {
      const session = seedSession({proposedDates: [aProposedDate({id: 'pd-1', votable: true, acceptable: true})]});
      const app = opponentApp({params: {id: session.id}, queries: {proposedDateId: 'pd-1', acceptable: 'false'}});
      await app.store.save(session);

      await handleOpponentAcceptablePost(app);

      const stored = await app.store.get(session.id);
      expect(stored?.proposedDates[0]?.acceptable)
        .toBe(false);
    });

    test('is a no-op when the proposedDateId is missing', async () => {
      const session = seedSession({proposedDates: [aProposedDate({id: 'pd-1', votable: true, acceptable: false})]});
      const app = opponentApp({params: {id: session.id}, queries: {acceptable: 'true'}});
      await app.store.save(session);

      await handleOpponentAcceptablePost(app);

      const stored = await app.store.get(session.id);
      expect(stored?.proposedDates[0]?.acceptable)
        .toBe(false);
    });

    test('rejects a wrong opponent-captain password', async () => {
      const session = seedSession({proposedDates: [aProposedDate({id: 'pd-1'})]});
      const app = createApp({params: {id: session.id}, queries: {proposedDateId: 'pd-1', acceptable: 'true'}});
      await app.store.save(session);

      await expectForbidden(handleOpponentAcceptablePost(app));
    });
  });

});
