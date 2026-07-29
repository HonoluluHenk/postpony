import config from '../src/config';
import { SqliteSessionStore } from '../src/lib/session-store';

const dbUrl = config.get('dbUrl');
const dbAuthToken = config.get('dbAuthToken');
const store = new SqliteSessionStore(dbUrl, dbAuthToken || undefined);

await store.migrate();

console.log(`Migration applied to ${dbUrl}`);
process.exit(0);
