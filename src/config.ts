import convict from 'convict';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadEnvFile } from 'node:process';

const envFile = resolve(process.cwd(), '.env');
if (existsSync(envFile)) {
  loadEnvFile(envFile);
}

const config = convict({
  env: {
    doc: 'The application environment.',
    format: ['production', 'development', 'test'],
    default: 'development',
    env: 'NODE_ENV',
  },
  port: {
    doc: 'The port to bind.',
    format: 'port',
    default: 3000,
    env: 'APP_PORT',
    arg: 'port',
  },
  hostname: {
    doc: 'The hostname to bind.',
    format: String,
    default: 'game-scheduler.localhost',
    env: 'APP_HOSTNAME',
    arg: 'hostname',
  },
  'base-url': {
    doc: 'The base URL of the application.',
    format: String,
    default: '',
    env: 'APP_BASE_URL',
    arg: 'base-url',
  },
  'use-fixtures': {
    doc: 'Whether to use fixtures.',
    format: Boolean,
    default: false,
    env: 'APP_USE_FIXTURES',
    arg: 'use-fixtures',
  },
  'click-tt-fixtures-dir': {
    doc: 'The directory containing click-tt.ch HTML fixtures.',
    format: String,
    default: '',
    env: 'APP_CLICK_TT_FIXTURES_DIR',
    arg: 'click-tt-fixtures-dir',
  },
  'db-url': {
    doc: 'SQLite database URL (libsql:// or file:).',
    format: String,
    default: 'file:./data/postpony.db',
    env: 'APP_DB_URL',
    arg: 'db-url',
  },
  'db-auth-token': {
    doc: 'Auth token for Turso/libSQL (empty for local file).',
    format: String,
    default: '',
    env: 'APP_DB_AUTH_TOKEN',
    arg: 'db-auth-token',
  },
  'tls-enabled': {
    doc: 'Whether the Node process terminates its own TLS. When false the app serves plain HTTP (suitable behind Cloudflare edge TLS or a reverse proxy).',
    format: Boolean,
    default: true,
    env: 'APP_TLS_ENABLED',
    arg: 'tls-enabled',
  },
});

// Perform validation
config.validate({allowed: 'strict'});

const dbUrl = config.get('db-url');
if (!dbUrl) {
  throw Error('Missing required config: db-url');
}
if (!dbUrl.startsWith('file:') && !config.get('db-auth-token')) {
  throw Error('Missing required config: db-auth-token');
}

if (config.get('use-fixtures') && !config.get('click-tt-fixtures-dir')) {

  config.set('click-tt-fixtures-dir', './src/lib/__fixtures__');
}
if (config.get('click-tt-fixtures-dir') && !config.get('use-fixtures')) {
  config.set('use-fixtures', true);
}
config.validate({allowed: 'strict'});

export default config;
