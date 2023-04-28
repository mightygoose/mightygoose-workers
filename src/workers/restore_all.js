const log = require('log-colors');
const SpotifyRestorer = require('../lib/restorers/spotify');
const BandcampRestorer = require('../lib/restorers/bandcamp');
const MusicbrainzRestorer = require('../lib/restorers/musicbrainz');
const dbClient = require('../lib/asyncDbClient');
const _ = require('lodash');
const config = require('../config');

const restorers = {
  spotify: new SpotifyRestorer.AlbumRestorer(),
  bandcamp: new BandcampRestorer.AlbumRestorer(),
  musicbrainz: new MusicbrainzRestorer.AlbumRestorer(),
}

const RESTORING_DELAY = config.RESTORING_DELAY * 2;


const lastRestoredItemQuery = `
  SELECT id FROM items
  WHERE (bandcamp IS NOT NULL
        or musicbrainz IS NOT NULL
        or spotify is NOT NULL)
        and created_at < '2016-10-31'
  ORDER BY id DESC
  LIMIT 1
`

const query = (id) => `
  SELECT *
  FROM items
  WHERE bandcamp IS NULL
        AND musicbrainz IS NULL
        AND spotify is NULL
        AND id > ${id}
        AND created_at < '2016-10-31'
  ORDER BY id
  LIMIT 5000
`

const restoreAll = async (title) => {
  return Object.keys(restorers).reduce(async (chain, restorer) => {
    try {
      const acc = await chain;
      const data = await restorers[restorer].restore({
        title
      });

      if (!data) {
        return acc;
      }

      return {
        ...acc,
        [restorer]: data
      }
    } catch (e) {
      log.error(`error during processing ${restorer}`)
      return acc;
    }
  }, Promise.resolve({}))
}

const generateUpdateQuery = (data, id) => {
  const chunks = Object.keys(data).map((key) => `${key} = '${JSON.stringify(data[key]).replace(/'/ig, "''")}'`);

  return `
    UPDATE items
    SET ${chunks.join(', ')}
    WHERE id = ${id}
  `
}

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const run = async () => {

  log.info('querying last restored item');
  const [lastRestoredItem] = await dbClient.query(lastRestoredItemQuery);

  log.info('requesting items to restore');
  const itemsToRestore = await dbClient.query(query(lastRestoredItem.id));
  log.info('done')

  for (let item of itemsToRestore) {
    log.info(`restoring #${item.id}: ${item.title}`)
    const data = await restoreAll(item.title)

    if (!Object.keys(data).length) {
      log.info(`skipping item #${item.id}. no data available`);
      continue;
    }

    log.info(`item #${item.id}, restored: ${Object.keys(data).join(', ')}`)

    const updateQuery = generateUpdateQuery(data, item.id);

    try {
      log.info(`updating item #${item.id}`);
      const updateResponse = await dbClient.query(updateQuery);
      log.info(`updated item #${item.id}`);
    } catch (e) {
      log.error(`error updating item ${item.id}: ${e}`);
      log.error(updateQuery);
    }

    log.info(`waiting ${RESTORING_DELAY} ms`);
    await wait(RESTORING_DELAY);
  }

  process.exit(0);

}

run();
