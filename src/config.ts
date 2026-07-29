import convict from 'convict';

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
  baseUrl: {
    doc: 'The base URL of the application.',
    format: String,
    default: '',
    env: 'APP_BASE_URL',
    arg: 'base-url',
  },
  useFixtures: {
    doc: 'Whether to use fixtures.',
    format: Boolean,
    default: false,
    env: 'APP_USE_FIXTURES',
    arg: 'use-fixtures',
  },
  clickTtFixturesDir: {
    doc: 'The directory containing click-tt.ch HTML fixtures.',
    format: String,
    default: '',
    env: 'APP_CLICK_TT_FIXTURES_DIR',
    arg: 'click-tt-fixtures-dir',
  },
  dbUrl: {
    doc: 'SQLite database URL (libsql:// or file:).',
    format: String,
    default: 'file:./data/postpony.db',
    env: 'APP_DB_URL',
    arg: 'db-url',
  },
  dbAuthToken: {
    doc: 'Auth token for Turso/libSQL (empty for local file).',
    format: String,
    default: '',
    env: 'APP_DB_AUTH_TOKEN',
    arg: 'db-auth-token',
  },
});

// Perform validation
config.validate({allowed: 'strict'});
if (config.get('useFixtures') && !config.get('clickTtFixturesDir')) {

  config.set('clickTtFixturesDir', './src/lib/__fixtures__');
}
if (config.get('clickTtFixturesDir') && !config.get('useFixtures')) {
  config.set('useFixtures', true);
}
config.validate({allowed: 'strict'});

export default config;
