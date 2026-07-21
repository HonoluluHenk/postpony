import pino from 'pino';
import config from '../config';

const isDev = config.get('env') === 'development';

export const logger = pino({
  level: isDev ? 'debug' : 'info',
  transport: isDev
             ? {
      target: 'pino/file',
      options: {destination: 1},
    }
             : undefined,
});
