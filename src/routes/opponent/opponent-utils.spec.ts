import { describe, expect, test } from 'vitest';
import { aSession } from '../../lib/__test-utils__/builders';
import { createApp } from '../../lib/__test-utils__/create-app';
import { hashPassword } from '../../lib/crypto-utils';
import { AppError } from '../../lib/errors';
import { opponentPasswordFromRequest, opponentTeam, requireOpponentCaptain, withOpponentPassword } from './opponent-utils';

const PASSWORD = 'opponent-captain-pw';

describe('opponentTeam', () => {
  test('is the away side when the organizer is home', () => {
    expect(opponentTeam(aSession({organizerTeam: 'home'})))
      .toBe('away');
  });

  test('is the home side when the organizer is away', () => {
    expect(opponentTeam(aSession({organizerTeam: 'away'})))
      .toBe('home');
  });
});

describe('opponentPasswordFromRequest', () => {
  test('reads the password from the request query', () => {
    const app = createApp({queries: {opponentCaptainPassword: 'abc'}});

    expect(opponentPasswordFromRequest(app))
      .toBe('abc');
  });

  test('falls back to the current URL query when the request has none', () => {
    const app = createApp({headers: {'HX-Current-URL': 'https://game-scheduler.localhost:3000/opponent/1?opponentCaptainPassword=xyz'}});

    expect(opponentPasswordFromRequest(app))
      .toBe('xyz');
  });

  test('prefers the request query over the current URL', () => {
    const app = createApp({
      queries: {opponentCaptainPassword: 'abc'},
      headers: {'HX-Current-URL': 'https://game-scheduler.localhost:3000/opponent/1?opponentCaptainPassword=xyz'},
    });

    expect(opponentPasswordFromRequest(app))
      .toBe('abc');
  });

  test('returns an empty string when neither source has the password', () => {
    expect(opponentPasswordFromRequest(createApp()))
      .toBe('');
  });

  test('returns an empty string when the current URL is invalid', () => {
    const app = createApp({headers: {'HX-Current-URL': 'not a url'}});

    expect(opponentPasswordFromRequest(app))
      .toBe('');
  });
});

describe('requireOpponentCaptain', () => {
  test('resolves when the password matches the hash', async () => {
    const session = aSession({opponentCaptainPasswordHash: await hashPassword(PASSWORD)});
    const app = createApp({queries: {opponentCaptainPassword: PASSWORD}});

    await expect(requireOpponentCaptain(app, session))
      .resolves
      .toBeUndefined();
  });

  test('rejects a missing password with a 403', async () => {
    const session = aSession({opponentCaptainPasswordHash: await hashPassword(PASSWORD)});
    const app = createApp();

    const error = await requireOpponentCaptain(app, session).catch((e: unknown) => e);

    expect(error)
      .toBeInstanceOf(AppError);
    expect((error as AppError).status)
      .toBe(403);
    expect((error as AppError).message)
      .toBe('Invalid opponent captain password.');
  });

  test('rejects a wrong password with a 403', async () => {
    const session = aSession({opponentCaptainPasswordHash: await hashPassword(PASSWORD)});
    const app = createApp({queries: {opponentCaptainPassword: 'wrong'}});

    const error = await requireOpponentCaptain(app, session).catch((e: unknown) => e);

    expect(error)
      .toBeInstanceOf(AppError);
    expect((error as AppError).status)
      .toBe(403);
  });
});

describe('withOpponentPassword', () => {
  test('appends the password to a URL without an existing query', () => {
    expect(withOpponentPassword('/opponent/1', 'pw'))
      .toBe('/opponent/1?opponentCaptainPassword=pw');
  });

  test('appends the password to a URL with an existing query', () => {
    expect(withOpponentPassword('/opponent/1/votable?proposedDateId=pd-1', 'pw'))
      .toBe('/opponent/1/votable?proposedDateId=pd-1&opponentCaptainPassword=pw');
  });

  test('leaves the URL unchanged when the password is absent', () => {
    expect(withOpponentPassword('/opponent/1', undefined))
      .toBe('/opponent/1');
    expect(withOpponentPassword('/opponent/1?sort=date', ''))
      .toBe('/opponent/1?sort=date');
  });
});
