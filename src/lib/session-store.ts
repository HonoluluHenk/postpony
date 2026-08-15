import { createClient } from '@libsql/client';
import type { Postponement, PostponementStatus, ProposedDate } from './models';

export interface SessionStore {
  get(id: string): Promise<Postponement | undefined>;

  save(session: Postponement): Promise<void>;
}

/**
 * Upgrades a session read from the store to the current shape. Old rows predate
 * `votableByOpponent`, `organizerTeam`, `reopenCount`, and `confirmedProposedDateId`,
 * and used removed statuses. Pure read-time normalization — nothing is rewritten.
 */
export function normalize(data: Record<string, unknown>): Postponement {
  const status: PostponementStatus =
    data['status'] === 'Draft' || data['status'] === 'Voting' || data['status'] === 'Confirmed'
      ? data['status']
      : 'Voting';

  // Pre-ADR-0017 sessions stored match details untyped under `metadata.match.*`;
  // the typed `homeTeam`/`guestTeam` fields win when both exist.
  const legacyMatch = (data['metadata'] as Record<string, unknown> | undefined)?.['match'] as
    Record<string, unknown> | undefined;
  const homeTeam = (data['homeTeam'] as string | undefined) ??
    (legacyMatch?.['homeTeam'] as string | undefined);
  const guestTeam = (data['guestTeam'] as string | undefined) ??
    (legacyMatch?.['guestTeam'] as string | undefined);

  const proposedDates: ProposedDate[] = (
    data['proposedDates'] as Record<string, unknown>[] | undefined ?? []
  ).map((pd): ProposedDate => ({
    id: pd['id'] as string,
    sessionId: pd['sessionId'] as string,
    dateTimeRange: pd['dateTimeRange'] as ProposedDate['dateTimeRange'],
    proposerId: pd['proposerId'] as string,
    votableByOpponent:
      typeof pd['votableByOpponent'] === 'boolean'
        ? pd['votableByOpponent']
        : typeof pd['awayTeamVotable'] === 'boolean'
          ? pd['awayTeamVotable']
          : false,
  }));

  return {
    ...(data as unknown as Postponement),
    homeTeam,
    guestTeam,
    organizerTeam: data['organizerTeam'] === 'away' ? 'away' : 'home',
    reopenCount: typeof data['reopenCount'] === 'number' ? data['reopenCount'] : 0,
    status,
    proposedDates,
  };
}

export class MemorySessionStore implements SessionStore {
  private readonly store = new Map<string, Postponement>();

  get(id: string): Promise<Postponement | undefined> {
    const session = this.store.get(id);
    return Promise.resolve(
      session ? normalize(session as unknown as Record<string, unknown>) : undefined,
    );
  }

  save(session: Postponement): Promise<void> {
    this.store.set(session.id, session);
    return Promise.resolve();
  }
}

export class SqliteSessionStore implements SessionStore {
  private readonly client;

  constructor(url: string, authToken?: string) {
    this.client = createClient({url, authToken});
  }

  async migrate(): Promise<void> {
    await this.client.execute(
      'CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, club_id TEXT NOT NULL, data TEXT NOT NULL)',
    );
  }

  async get(id: string): Promise<Postponement | undefined> {
    const result = await this.client.execute({
      sql: 'SELECT data FROM sessions WHERE id = ?',
      args: [id],
    });
    if (result.rows.length === 0) {
      return undefined;
    }
    const row = result.rows[0];
    if (!row) {
      return undefined;
    }
    const data = JSON.parse(row['data'] as string) as Record<string, unknown>;
    if (!data['id'] || !data['clubId']) {
      throw new Error(`Corrupt session data for id=${id}`);
    }
    return normalize(data);
  }

  async save(session: Postponement): Promise<void> {
    await this.client.execute({
      sql: 'INSERT INTO sessions (id, club_id, data) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data',
      args: [session.id, session.clubId, JSON.stringify(session)],
    });
  }
}
