import config from '../src/config';
import { SqliteSessionStore } from '../src/lib/session-store';

const dbUrl = config.get('db-url');
const dbAuthToken = config.get('db-auth-token');
const store = new SqliteSessionStore(dbUrl, dbAuthToken || undefined);

await store.migrate();

console.log(`Migration applied to ${dbUrl}`);
process.exit(0);
