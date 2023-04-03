const koa = require('koa');
const route = require('koa-route');
const request = require('koa-request');
const body_parser = require('koa-body-parser');
const log = require('log-colors');
const urllib = require('url');
const queue = require('./lib/clients/queue');

const RABBITMQ_CHANNEL = process.env['RABBITMQ_CHANNEL'];
const port = process.env['PORT'] || 3000;

var app = koa();

app.use(body_parser({ limit: '10mb' }));

app.use(route.post('/api/add_post', function*() {
  const response = new Promise((resolve) => {
    queue.then(() => {
      queue
        .publish(this.request.body, { key: RABBITMQ_CHANNEL })
        .on('drain', () => resolve(true));
    })
  }).then(() => {
    log.info(`${item.crawler_name} crawler item #${item.sh_key} added to queue`);
    return ["in_process", item['badges']];
  });

  this.body = JSON.stringify(response);
}));



try {
  app.listen(port, () => log.info(`server is running on port: ${port}`))
} catch (error) {
  log.error(`could not start server: ${error}`)
}


