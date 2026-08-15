import { createClient } from '@libsql/client';
import type { Postponement } from './models';

export interface SessionStore {
  get(id: string): Promise<Postponement | undefined>;

  save(session: Postponement): Promise<void>;
}

export class MemorySessionStore implements SessionStore {
  private readonly store = new Map<string, Postponement>();

  get(id: string): Promise<Postponement | undefined> {
    return Promise.resolve(this.store.get(id));
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
    return data as unknown as Postponement;
  }

  async save(session: Postponement): Promise<void> {
    await this.client.execute({
      sql: 'INSERT INTO sessions (id, club_id, data) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data',
      args: [session.id, session.clubId, JSON.stringify(session)],
    });
  }
}
