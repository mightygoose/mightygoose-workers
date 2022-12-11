"use strict"

const jackrabbit = require('jackrabbit');

const log = require('log-colors');

const RABBITMQ_URL = process.env['RABBITMQ_URL'];


class QueueClient {
  constructor(){
    return new Promise((resolve) => {
      log.info('connecting to queue');
      var queue = jackrabbit(RABBITMQ_URL)
      .on('connected', function() {
        log.info('connected to queue');
        resolve(queue);
      })
      .on('error', function(err) {
        log.info('queue error: ', err);
        reject(err);
      });
    })
  }
}

module.exports = new QueueClient();
