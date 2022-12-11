const massive = require("massive");
const aws = require('aws-sdk');
const spawn = require('lib/spawn');
const log = require('log-colors');
const sm = require('sitemap');
const get_slug = require('speakingurl');

const AWS_ACCESS_KEY_ID = process.env['AWS_ACCESS_KEY_ID'];
const AWS_SECRET_ACCESS_KEY = process.env['AWS_SECRET_ACCESS_KEY'];
const S3_BUCKET = process.env['S3_BUCKET'];

const DB_HOST = process.env['DB_HOST'];
const DB_PORT = process.env['DB_PORT'];
const DB_USER = process.env['DB_USER'];
const DB_PASSWD = process.env['DB_PASSWD'];
const DB_NAME = process.env['DB_NAME'];


const s3 = new aws.S3();


spawn(function*(){

  var db = yield new Promise((resolve) => {
    log.info('connecting to db');
    massive.connect({
      connectionString: `postgres://${DB_USER}:${DB_PASSWD}@${DB_HOST}/${DB_NAME}`
    }, (err, _db) => {
      log.info('connected to db');
      resolve(_db);
    });
  });

  var items = yield new Promise((resolve) => {
    db.run('select id, title from items', (err, items) => {
      if(err){ log.error(err); }
      resolve(items);
    });
  });

  log.info(`got ${items.length} items`);

  log.info(`processing items`);
  var files_count = Math.ceil(items.length / 50000);
  for(var counter = 0; counter < files_count; counter++){
    var sitemap = sm.createSitemap ({
      hostname: 'http://mightygoose.com',
      cacheTime: 600000
    });

    log.info(`crating sitemap #${counter}`);

    var items_portion = items.splice(0, 50000);

    items_portion.forEach((item) => {
      sitemap.add({url: `/post/${item.id}/${get_slug(item.title)}`, changefreq: 'monthly'});
    });

    log.info(`generating xml content`);
    var xml_body = yield new Promise((resolve, reject) => {
      sitemap.toXML(function (err, xml){
        if(err){
          reject(err);
          return;
        }
        resolve(xml);
      });
    });

    log.info(`saving sitemap file`);
    var s3_result = yield new Promise((resolve, reject) => {
      s3.putObject({
        Bucket: S3_BUCKET,
        Key: `sitemap_${counter}.xml`,
        Body: xml_body
      }, function(err){
        if(err){
          reject(err);
          return;
        }
        resolve(true);
      });
    }).catch((e) => {
      log.error(`couldn't save sitemap file, error: ${e}`);
      process.exit(0);
    });
  }

  log.info(`sitemap updated`);
  process.exit(0);

});
