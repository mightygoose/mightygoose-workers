const Koa = require('koa');
const route = require('koa-route');
const body_parser = require('koa-body-parser');
const log = require('log-colors');
const { Queue } = require("bullmq");
const connection = require('./lib/redis');
const config = require('./config');

const port = process.env['PORT'] || 3000;

const queue = new Queue(config.ITEMS_CHANNEL, { connection });

const app = new Koa();

//response time
app.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  console.log(`${ctx.method} ${ctx.url} - ${ms}ms`);
  ctx.set('X-Response-Time', ms + 'ms');
});


app.use(body_parser({ limit: '10mb' }));

app.use(route.post('/api/add_post', async (ctx) => {
  const item = ctx.request.body;

  queue.add(config.PROCESS_ITEM_JOB, item)
  log.info(`${item.crawler_name} crawler item #${item.sh_key} added to queue`);

  ctx.body = JSON.stringify(["in_process", item['badges']]);
}));



try {
  app.listen(port, () => log.info(`server is running on port: ${port}`))
} catch (error) {
  log.error(`could not start server: ${error}`)
}


