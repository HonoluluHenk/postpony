import { createClient } from '@libsql/client';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import type { Postponement } from './models';
import { MemorySessionStore, SqliteSessionStore, normalize } from './session-store';

function tempDbUrl(): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'postpony-'));
  return `file:${path.join(dir, 'test.db')}`;
}

function legacySession(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'legacy-1',
    clubId: 'test-club',
    name: 'Legacy Session',
    organizerPasswordHash: 'h-organizer',
    invitationPasswordHash: 'h-invite',
    invitationPassword: 'pw',
    status: 'Proposed',
    players: [],
    proposedDates: [
      {
        id: 'pd-1',
        sessionId: 'legacy-1',
        dateTimeRange: {start: '2025-09-01T20:00:00', end: '2025-09-01T22:00:00'},
        proposerId: 'player-1',
        awayTeamVotable: true,
      },
    ],
    votes: [],
    createdAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('normalize', () => {
  test('upgrades a legacy row: flag rename, defaults, and status remap', () => {
    const session = normalize(legacySession());

    expect(session.status)
      .toBe('Voting');
    expect(session.organizerTeam)
      .toBe('home');
    expect(session.reopenCount)
      .toBe(0);
    expect(session.confirmedProposedDateId)
      .toBeUndefined();
    // row only carries the pre-rename awayTeamVotable key; the legacy value surfaces as votable
    expect(session.proposedDates[0]?.votable)
      .toBe(true);
  });

  test('maps the other legacy status to Voting', () => {
    expect(normalize(legacySession({status: 'Confirmed by Opponent'})).status)
      .toBe('Voting');
  });

  test('keeps current statuses', () => {
    expect(normalize(legacySession({status: 'Draft'})).status)
      .toBe('Draft');
    expect(normalize(legacySession({status: 'Voting'})).status)
      .toBe('Voting');
    expect(normalize(legacySession({status: 'Confirmed'})).status)
      .toBe('Confirmed');
  });

  test('keeps the modern votable flag when present', () => {
    const session = normalize(legacySession({
      status: 'Voting',
      organizerTeam: 'away',
      reopenCount: 2,
      confirmedProposedDateId: 'pd-1',
      proposedDates: [
        {
          id: 'pd-1',
          sessionId: 'legacy-1',
          dateTimeRange: {start: '2025-09-01T20:00:00', end: '2025-09-01T22:00:00'},
          proposerId: 'player-1',
          votable: false,
        },
      ],
    }));

    expect(session.status)
      .toBe('Voting');
    expect(session.organizerTeam)
      .toBe('away');
    expect(session.reopenCount)
      .toBe(2);
    expect(session.confirmedProposedDateId)
      .toBe('pd-1');
    expect(session.proposedDates[0]?.votable)
      .toBe(false);
  });

  test('falls back to the old votableByOpponent key when votable is absent', () => {
    const session = normalize(legacySession({
      proposedDates: [
        {
          id: 'pd-1',
          sessionId: 'legacy-1',
          dateTimeRange: {start: '2025-09-01T20:00:00', end: '2025-09-01T22:00:00'},
          proposerId: 'player-1',
          votableByOpponent: false,
        },
      ],
    }));

    expect(session.proposedDates[0]?.votable)
      .toBe(false);
  });

  test('defaults the flag to false when no votable key is present', () => {
    const raw = legacySession();
    const rawDates = raw['proposedDates'] as Record<string, unknown>[];
    delete rawDates[0]?.['awayTeamVotable'];

    expect(normalize(raw).proposedDates[0]?.votable)
      .toBe(false);
  });

  test('leaves a session without proposed dates alone', () => {
    const session = normalize(legacySession({proposedDates: []}));

    expect(session.proposedDates)
      .toEqual([]);
  });

  test('leaves home/guest team fields undefined for sessions without match details', () => {
    const session = normalize(legacySession());

    expect(session.homeTeam)
      .toBeUndefined();
    expect(session.guestTeam)
      .toBeUndefined();
  });

  test('does not migrate legacy metadata.match details into typed home/guest team fields', () => {
    const session = normalize(legacySession({
      metadata: {
        source: 'click-tt.ch',
        match: {homeTeam: 'Thun', guestTeam: 'Ostermundigen'},
      },
    }));

    // The legacy metadata.match migration is removed: no typed fields are back-filled.
    expect(session.homeTeam)
      .toBeUndefined();
    expect(session.guestTeam)
      .toBeUndefined();
  });
});

describe('SqliteSessionStore', () => {
  test('migrates, saves, and normalizes a legacy session on read', async () => {
    const store = new SqliteSessionStore(tempDbUrl());
    await store.migrate();
    await store.save(legacySession() as unknown as Postponement);

    const session = await store.get('legacy-1');

    expect(session?.status)
      .toBe('Voting');
    expect(session?.organizerTeam)
      .toBe('home');
    expect(session?.reopenCount)
      .toBe(0);
    expect(session?.proposedDates[0]?.votable)
      .toBe(true);
  });

  test('returns undefined for a missing id', async () => {
    const store = new SqliteSessionStore(tempDbUrl());
    await store.migrate();

    await expect(store.get('missing'))
      .resolves
      .toBeUndefined();
  });

  test('treats corrupt session data (missing id/clubId) as absent', async () => {
    const url = tempDbUrl();
    const store = new SqliteSessionStore(url);
    await store.migrate();
    const raw = createClient({url});
    await raw.execute({
      sql: 'INSERT INTO sessions (id, club_id, data) VALUES (?, ?, ?)',
      args: ['x', 'club-x', JSON.stringify({name: 'no id or clubId'})],
    });

    await expect(store.get('x'))
      .resolves
      .toBeUndefined();
  });
});

describe('MemorySessionStore.get', () => {
  test('normalizes a legacy-shaped stored row on read', async () => {
    const store = new MemorySessionStore();
    await store.save(legacySession() as unknown as Postponement);

    const session = await store.get('legacy-1');

    expect(session?.status)
      .toBe('Voting');
    expect(session?.organizerTeam)
      .toBe('home');
    expect(session?.reopenCount)
      .toBe(0);
    expect(session?.proposedDates[0]?.votable)
      .toBe(true);
  });

  test('returns a current-shaped session unchanged on read', async () => {
    const store = new MemorySessionStore();
    const session: Postponement = {
      id: 'current-1',
      clubId: 'test-club',
      name: 'Current Session',
      organizerPasswordHash: 'h-organizer',
      invitationPasswordHash: 'h-invite',
      invitationPassword: 'pw',
      status: 'Voting',
      organizerTeam: 'away',
      reopenCount: 1,
      confirmedProposedDateId: 'pd-1',
      players: [],
      venues: [],
      proposedDates: [],
      votes: [],
      createdAt: '2025-01-01T00:00:00.000Z',
    };
    await store.save(session);

    const stored = await store.get('current-1');

    expect(stored)
      .toEqual(session);
  });
});