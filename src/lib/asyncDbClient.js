"use strict"

const { Client } = require('pg')
const log = require('log-colors');

const DB_HOST = process.env['DB_HOST'];
const DB_PORT = process.env['DB_PORT'];
const DB_USER = process.env['DB_USER'];
const DB_PASSWD = process.env['DB_PASSWD'];
const DB_NAME = process.env['DB_NAME'];


class DbClient {

  client = new Client({
    connectionString: `postgres://${DB_USER}:${DB_PASSWD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`
  })

  constructor() {
    log.info('connecting to db');

    this.client.connect(() => {
      log.info('connected to db');
    });
  }

  query = async (query) => new Promise((resolve, reject) => this.client.query(query, (err, res) => {
    if (err) {
      return reject(err);
    }
    return resolve(res.rows || []);
  }))
}

module.exports = new DbClient();
