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
  },
  hostname: {
    doc: 'The hostname to bind.',
    format: String,
    default: 'game-scheduler.localhost',
    env: 'APP_HOSTNAME',
  },
  baseUrl: {
    doc: 'The base URL of the application.',
    format: String,
    default: '',
    env: 'APP_BASE_URL',
  },
});

// Perform validation
config.validate({allowed: 'strict'});

export default config;
