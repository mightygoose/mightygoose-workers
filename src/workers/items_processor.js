"use strict"

const log = require('log-colors');
const _ = require('lodash');
const replaceSpecialCharacters = require('replace-special-characters');
const { Worker } = require("bullmq");

const dbClient = require('../lib/asyncDbClient');

const string_parser = require('../lib/string_parser');
const StringAnalyser = require('../lib/string_analyser');

const discogs_client = require('../lib/discogs_client');

const connection = require('../lib/redis');
const config = require('../config');

const restorers = {
  discogs: new (require('../lib/restorers/discogs')).AlbumRestorer(),
  itunes: new (require('../lib/restorers/itunes')).AlbumRestorer(),
  deezer: new (require('../lib/restorers/deezer')).AlbumRestorer(),
  spotify: new (require('../lib/restorers/spotify')).AlbumRestorer(),
  bandcamp: new (require('../lib/restorers/bandcamp')).AlbumRestorer(),
}


const analyser = new StringAnalyser();

const MAX_RESTORING_ATTEMPTS = 2;


const generateQueryString = (item) => {
  //should be common logic for all restorers
  var prepared = _.pick(Object.assign({}, item, {
    discogs: _.pick(item.discogs_data, [
      "id", "type", "resource_url", "similarity", "thumb", "country", "year"
    ]),
    sh_type: item.crawler_name,
    tags: item.merged_tags
  }, _.isUndefined(item.restorers_data.itunes) ? {} : {
    itunes: item.restorers_data.itunes,
  }, _.isUndefined(item.restorers_data.spotify) ? {} : {
    spotify: item.restorers_data.spotify,
  }, _.isUndefined(item.restorers_data.deezer) ? {} : {
    deezer: item.restorers_data.deezer,
  }, _.isUndefined(item.restorers_data.bandcamp) ? {} : {
    bandcamp: item.restorers_data.bandcamp,
  }), [
    "sh_key", "sh_type", "embed", "images", "title", "url",
    "badges", "discogs", "itunes", "deezer", "bandcamp", "spotify", "tags"
  ]);


  var data = _.reduce(prepared, (acc, value, key) => {
    acc.fields.push(`"${key}"`);
    acc.values.push(`'${(
      typeof value === 'string'
        ? value
        : JSON.stringify(value)
    ).replace(/'/ig, "''")}'`);
    return acc;
  }, { fields: [], values: [] });


  return `
      INSERT INTO ${item.item_table} (${data.fields.join(', ')})
      VALUES (${data.values.join(', ')});
    `;
}

const generateBadges = (item) => {
  var badges = JSON.parse(item['badges']);
  var discogs_data = item.discogs_data;
  if (!discogs_data) {
    badges.push('discogs-no-results');
  } else {
    if (discogs_data.similarity === 1) {
      badges.push('discogs-title-exact-match');
    } else {
      var prepared_item_title = _.trim(
        item['title']
          .replace(/\(\d{4}\)/ig, '')
          .replace(/\[\d{4}\]/ig, '')
          .replace(/\d{0,4}kbps/ig, '')
          .replace(/\(\)/ig, '')
          .replace(/\[\]/ig, '')
          .replace(/(\/.*)/ig, '')
          .replace(/[^0-9a-zA-Z ]+/ig, '')
          .toLowerCase());

      var prepared_discogs_title = discogs_data['title'].replace(/[^0-9a-zA-Z ]+/ig, '').toLowerCase();
      if (prepared_item_title === prepared_discogs_title) {
        badges.push('discogs-title-match-after-clean');
      } else {
        badges.push('discogs-title-doesnt-match');
      }
    }
  }
  return badges;
}

const generateStatus = (item) => {
  switch (true) {
    case !~item.badges.indexOf('discogs-no-results') && item.discogs_data.similarity > 0.5:
    case item.restorers_data.itunes && item.restorers_data.itunes.similarity === 1:
    case item.restorers_data.deezer && item.restorers_data.deezer.similarity === 1:
    case item.restorers_data.spotify && item.restorers_data.spotify.similarity === 1:
      return 'good';
    default:
      return 'bad';
  }
}

const generateTableName = (item) => {
  switch (true) {
    case item.status === 'good':
      return 'items';
    default:
      return 'bad_items';
  }
}


const processData = async (item, masks) => {
  try {
    log.info(`processing item #${item.sh_key}`);
    var processed_item = Object.assign({}, item);

    //should be filtered on spider side
    Object.assign(processed_item, {
      title: _.trim(
        replaceSpecialCharacters(processed_item.title).replace(/\p{C}/gu, '').replace(/\p{Zs}/gu, ' ').replace(/…/gu, '')
      )
    });

    var mask = analyser.classify_mask(processed_item.title)[0];
    var title_variants = mask ? string_parser.parse_string(processed_item.title, mask.mask).slice(0, MAX_RESTORING_ATTEMPTS) : [];

    const restorersData = await Promise.all(Object.keys(restorers).map(async (restorer_name) => {
      var data = null;
      try {
        if (!title_variants.length) {
          return null;
        }
        for (var variant of title_variants) {
          data = await restorers[restorer_name].restore(Object.assign({}, processed_item, {
            title: `${variant.artist} - ${variant.album}`
          })).catch((e) => null);
          if (data !== null) {
            return { [restorer_name]: data };
          }
        }
      } catch (e) {
        log.warn(`could not process item ${item.id} with restorer  ${restorer_name}. Error: ${e}`)
      }
      return data;
    }));

    Object.assign(processed_item, {
      restorers_data: restorersData.reduce((acc, item) => {
        if (!item) {
          return acc;
        }
        return {
          ...acc,
          ...item,
        }
      }, {})
    });


    //bad! discogs data should be on the same level
    Object.assign(processed_item, {
      discogs_data: processed_item.restorers_data.discogs
    });

    //create method get_merged_tags()
    Object.assign(processed_item, {
      merged_tags: _.uniq(
        JSON.parse(processed_item.tags).concat((processed_item.discogs_data || { genre: [] }).genre)
          .concat((processed_item.discogs_data || { style: [] }).style)
      )
    });


    /* think of something better here */
    Object.assign(processed_item, {
      original_title: processed_item.title,
    }, !processed_item.discogs_data ? {} : {
      title: processed_item.discogs_data.title
    });
    /* / */


    Object.assign(processed_item, {
      badges: generateBadges(processed_item)
    });

    Object.assign(processed_item, {
      status: generateStatus(processed_item)
    });

    Object.assign(processed_item, {
      item_table: generateTableName(processed_item)
    });


    return processed_item;

  } catch (e) {
    log.error(`error while processing item. ${e}`)
  }
}

const processItem = async (item) => {
  try {
    const processedItem = await processData(item);
    const queryString = generateQueryString(processedItem);

    if (process.env['NODE_ENV'] !== 'production') {
      return log.info(queryString);
    }
    await dbClient.query(queryString);
    log.info(`item #${item.sh_key} added to table ${processedItem.item_table}`);
  } catch (e) {
    log.error(e);
  }
}

const runWorker = async () => {
  log.info('pulling masks');
  var masksQuery = `
        SELECT y.string AS string, y.data AS data, y.mask AS mask, z.occurencies AS occurencies
          FROM (
              SELECT
              recognition_result->'title'->>'original_title'::text AS string,
              json_build_object(
                  'year', recognition_result->'title'->>'year',
                  'album', recognition_result->'title'->'album',
                  'artist', recognition_result->'title'->'artist'
              ) AS data,
              recognition_result->'title'->>'mask'::text AS mask
              FROM recognition_masks
          ) y, (
            SELECT
                recognition_result->'title'->>'mask'::text AS mask,
                count(*) AS occurencies
            FROM recognition_masks
            GROUP BY mask
            ORDER BY occurencies DESC
          ) z
        WHERE y.mask = z.mask AND occurencies > 10
        ORDER BY occurencies desc
      `;

  var masks = await dbClient.query(masksQuery);

  log.info('masks pulled', masks.length);

  log.info('training title analyser');
  analyser.train(masks.map(mask => [mask['string'], mask['data'], mask['mask']]));

  await new Promise((resolve) => analyser.on('weights_updated', resolve));
  log.info('title analyser trained');

  const worker = new Worker(config.ITEMS_CHANNEL, async ({ name, data }) => {
    if (name === config.PROCESS_ITEM_JOB) {
      await processItem(data);

      //sleep before next restoring session
      log.info(`waiting ${config.RESTORING_DELAY}ms`);
      await new Promise((resolve) => {
        setTimeout(resolve, config.RESTORING_DELAY);
      });

      return true;
    }
  }, {
    connection,
  });

  worker.on('error', (error) => {
    log.error(`worker error: ${error}`);
  });

  worker.on('drained', () => {
    log.info('queue is empty, no items to process');
  });

  process.on('SIGTERM', () => {
    console.info('SIGTERM signal received. closing the worker');
    worker.close(true);
  });
}

if (process.env['NODE_ENV'] !== 'test') {
  try {
    runWorker();
  } catch (e) {
    log.error(`error on initialisation. ${e}`);
  }
}


module.exports = runWorker;







