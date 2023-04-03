const koa = require('koa');
const route = require('koa-route');
const request = require('koa-request');
const body_parser = require('koa-body-parser');
const log = require('log-colors');
const urllib = require('url');
const queueClient = require('./lib/clients/queue');

const RABBITMQ_CHANNEL = process.env['RABBITMQ_CHANNEL'];
const port = process.env['PORT'] || 3000;

const queuePromise = queueClient.then(q => q.default());

var app = koa();

//response time
app.use(function*(next) {
  var start = new Date;
  yield next;
  var ms = new Date - start;
  this.set('X-Response-Time', ms + 'ms');
});

// logger
app.use(function*(next) {
  var start = new Date;
  yield next;
  var ms = new Date - start;
  log.info(`${this.method} ${this.url} - ${ms} ms`);
});

app.use(body_parser({ limit: '10mb' }));

app.use(route.post('/api/add_post', function*() {
  const item = this.request.body;
  const response = new Promise((resolve) => {
    queuePromise.then((queue) => {
      queue
        .publish(item, { key: RABBITMQ_CHANNEL })
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


