import type { Client } from '@libsql/client/web';
import type { Postponement, PostponementStatus, ProposedDate } from './models';

export interface SessionStore {
  migrate(): Promise<void>;

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

  async migrate(): Promise<void> {
    // In-memory store needs no schema setup.
  }

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
  private client: Client | undefined;
  private readonly url: string;
  private readonly authToken: string | undefined;

  constructor(url: string, authToken?: string) {
    this.url = url;
    this.authToken = authToken;
  }

  // ponytail: the libSQL client is loaded lazily. `file:` URLs use the Node
  // client; `libsql://` (Turso) uses the web client which also runs on
  // Cloudflare Workers. Non-literal specifiers keep both clients out of the
  // Worker bundle — only the web branch is ever reached there.
  private async getClient(): Promise<Client> {
    if (this.client) {
      return this.client;
    }
    let client: Client;
    if (this.url.startsWith('file:')) {
      // ponytail: node client is dev-only (file: URLs). Non-literal specifier
      // keeps it out of the Cloudflare Worker bundle — this branch is never
      // reached on the Worker (which uses libsql:// Turso URLs).
      const nodeMod = '@libsql/client';
      const mod = (await import(nodeMod)) as typeof import('@libsql/client');
      client = mod.createClient({url: this.url, authToken: this.authToken});
    } else {
      // ponytail: the web client MUST be bundled into the Worker (literal
      // specifier) so the Turso HTTP client actually ships with the deploy.
      const mod = await import('@libsql/client/web');
      client = mod.createClient({url: this.url, authToken: this.authToken});
    }
    this.client = client;
    return client;
  }

  async migrate(): Promise<void> {
    const client = await this.getClient();
    await client.execute(
      'CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, club_id TEXT NOT NULL, data TEXT NOT NULL)',
    );
  }

  async get(id: string): Promise<Postponement | undefined> {
    const client = await this.getClient();
    const result = await client.execute({
      sql: 'SELECT data FROM sessions WHERE id = ?',
      args: [id],
    });
    if (result.rows.length === 0) {
      return undefined;
    }
    const row = result.rows[0] as Record<string, unknown>;
    const data = JSON.parse(row['data'] as string) as Record<string, unknown>;
    // ponytail: libSQL always returns the requested column; a row without a
    // usable id/clubId is treated as absent rather than a 500.
    if (!data['id'] || !data['clubId']) {
      return undefined;
    }
    return normalize(data);
  }

  async save(session: Postponement): Promise<void> {
    const client = await this.getClient();
    await client.execute({
      sql: 'INSERT INTO sessions (id, club_id, data) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data',
      args: [session.id, session.clubId, JSON.stringify(session)],
    });
  }
}
