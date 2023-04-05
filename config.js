module.exports = {
  REDIS_URL: process.env['REDIS_URL'],
  REDIS_MAX_CONNECTION_RETRIES: process.env['REDIS_URL'] || 10,
  PROCESS_ITEM_JOB: 'process-item',
  ITEMS_CHANNEL: process.env['PUB_SUB_CHANNEL'] || 'items',
  RESTORING_DELAY: process.env['RESTORING_DELAY'] || 5000,
}
