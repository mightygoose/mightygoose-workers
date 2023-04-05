const log = require('log-colors');
const IORedis = require('ioredis');
const config = require('../config');

const connection = new IORedis(config.REDIS_URL, {
  retryStrategy(times) {
    if (times > config.REDIS_MAX_CONNECTION_RETRIES) {
      console.log(`maximim reconnection attempts reached (${config.REDIS_MAX_CONNECTION_RETRIES}). shutting down`)
      process.exit(0);
    }
    const delay = Math.min(times * 200, 10000);
    return delay;
  },
});
connection.on('connect', () => log.info('connected to queue'));
connection.on('close', () => log.info('queue connection closed'));
connection.on('error', (error) => log.info(`queue connection error: ${error}`));
connection.on('reconnecting', () => log.info(`reconnecting`));

process.on('SIGTERM', () => {
  log.info('SIGTERM signal received.');
  log.info('disconnecting from queue')
  connection.disconnect();
});

module.exports = connection;
