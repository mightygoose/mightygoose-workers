const pry = require('pryjs');

const massive = require("massive");
const log = require('log-colors');
const spawn = require('co');

const discogs_client = require('lib/discogs_client');

const itunes_album_restorer = new (require('lib/restorers/itunes')).AlbumRestorer();
const deezer_album_restorer = new (require('lib/restorers/deezer')).AlbumRestorer();

const track_restorers = {
  itunes: new (require('lib/restorers/itunes')).TrackRestorer(),
  deezer: new (require('lib/restorers/deezer')).TrackRestorer()
}

const s_digital_restorer = require('lib/restorers/7digital');

const DB_HOST = process.env['DB_HOST'];
const DB_PORT = process.env['DB_PORT'];
const DB_USER = process.env['DB_USER'];
const DB_PASSWD = process.env['DB_PASSWD'];
const DB_NAME = process.env['DB_NAME'];

const TABLE = 'items';
const LIMIT = 20000;


var connect = () => {
  return new Promise((resolve, reject) => {
    massive.connect({
      connectionString: `postgres://${DB_USER}:${DB_PASSWD}@${DB_HOST}/${DB_NAME}`
    }, (err, data) => resolve(data));
  });
};

spawn(function*(){
  log.info('connecting to db');
  var db = yield connect();
  log.info('connected to db');

  var query = (q) => {
    return new Promise((resolve, reject) => {
      db.run(q, (err, stat) => {
        if(err){
          reject(err);
          return;
        }
        resolve(stat, err);
      });
    }).catch((e) => {
      log.error(`${e}, QUERY: ${q}`);
    })
  }

  var result = yield query(`
    select id from ${TABLE}
    where
      deezer = 'null'
      and itunes = 'null'
      and tracklist is null
      and discogs->>'type' != 'artist'
      and discogs->>'type' != 'label'
    limit ${LIMIT}
  `);
  log.info(`processing ${result.length} items`);

  for(var item of result){
    try {
      var item_data = yield query(`select * from ${TABLE} where id = ${item.id}`);

      var discogs_data = yield discogs_client.get_info(item_data[0].discogs);

      var data = yield Object.keys(track_restorers).reduce((acc, provider) => {
        acc[provider] = discogs_data.tracklist.map(track => {
          return track_restorers[provider].restore(track);
        });
        return acc;
      }, {});
      var tracks = Object.keys(data).reduce((acc, provider) => {
        var list = data[provider].filter(item => !!item);
        if(list.length){
          (acc = acc || {})[provider] = list;
        }
        return acc;
      }, null);

      var query_text = `UPDATE ${TABLE} set tracklist = '${JSON.stringify(tracks).replace(/'/ig, "''")}' WHERE id = ${item.id}`;
      var query_result = yield query(query_text);
      query_result && log.info(`item #${item.id} updated`);
    } catch(e) {
      log.info(`could not process item #${item.id}, ERROR: ${e.stack}`);
    }
  }

  process.exit(0);
});

