const pry = require('pryjs');

const log = require('log-colors');
const spawn = require('co');
const cheerio = require('cheerio');
const _ = require('lodash');

const db_client = require('../lib/clients/db');
const discogs_client = require('../lib/discogs_client');

const track_restorers = {
  itunes: new (require('../lib/restorers/itunes')).TrackRestorer(),
  deezer: new (require('../lib/restorers/deezer')).TrackRestorer()
}


var db;
db_client.then(_db => db = _db);

process.on('postprocess', postprocess);

function postprocess(item){
  var discogs_data = item.discogs_data;
  var itunes_data = item.restorers_data.itunes;
  var deezer_data = item.restorers_data.deezer;
  var spotify_data = item.restorers_data.spotify;
  spawn(function*(){
    if(_.isNull(spotify_data) && _.isNull(deezer_data) && !_.isNull(discogs_data)){
      log.info(`restoring tracklist of item #${item.sh_key}`);
      var discogs_additional_data = yield discogs_client.get_info(discogs_data);
      var data = yield Object.keys(track_restorers).reduce((acc, provider) => {
        acc[provider] = discogs_additional_data.tracklist.map(track => {
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

      var tracklist_query_string = `
        UPDATE ${item.item_table}
        SET tracklist = '${JSON.stringify(tracks).replace(/'/ig, "''")}'
        WHERE sh_key = '${item.sh_key}'
      `;
      if(process.env['NODE_ENV'] !== 'production'){
        console.log(tracklist_query_string);
      } else {
        db.run(tracklist_query_string, (err, items) => {
          if(err){ log.error(err); }
          log.info(`tracklist updated for item #${item.sh_key}`);
        });
      }

      //process content
      var artist = discogs_additional_data.artist;
      var album = discogs_additional_data.title;
      var year = discogs_additional_data.year;
      var recognition_mask = {
        title: {
          mask: item.original_title.trim()
                              .toLowerCase()
                              .replace(album.toLowerCase(), '{album}')
                              .replace(artist.toLowerCase(), '{artist}')
                              .replace(year, '{year}'),
          original_title: item.original_title.trim(),
          artist: artist,
          album: album,
          year: year
        },
        tracklist: []
      }


      var content_chunks = JSON.parse(item.content).replace(/<.*?>/ig, '\n').split('\n').filter(chunk => chunk.length);

      var tracklist = discogs_additional_data.tracklist;
      var len = tracklist.length;
      recognition_mask.tracklist = (function ngram(input, acc){
        acc.push(input.slice(0, len));
        return input.length > len ? ngram(input.slice(1), acc) : acc;
      })(content_chunks, [])
      .reduce((acc, item) => {
        var matches_count = tracklist.reduce((acc, track, index) => {
          return acc + item.reduce((acc, gr) => acc + (~gr.indexOf(track.title) ? 1 : 0), 0);
        }, 0);
        if(matches_count >= (acc.matches_count || 0)){
          return {
            gram: item,
            matches_count: matches_count
          };
        }
        return acc;
      }, {}).gram
      .reduce((acc, item, index) => {
        var track = tracklist.find(track => ~item.indexOf(track.title));
        if(!track){ return acc; }
        var track_artist = track.artist;
        var track_title = track.title;
        var track_position = track.position;
        var track_duration = track.duration.length ? track.duration : null;
        var track_index = tracklist.findIndex(t => t.position === track.position) + 1;
        var track_position_leading_zero = /^\d+$/.test(track_position)
          ? (+(track_position) > 9 ? track_position : "0" + track_position)
          : null;
          return acc.concat({
            mask: item.trim()
                      .toLowerCase()
                      .replace(track_title.toLowerCase(), '{track_name}')
                      .replace(track_artist.toLowerCase(), '{artist}')
                      .replace(track_duration, '{duration}')
                      .replace(
                        new RegExp(`(^${track_position.toLowerCase()}|${track_position.toLowerCase()}$)`),
                        '{position}'
                      )
                      .replace(
                        new RegExp(`(^${track_position_leading_zero}|${track_position_leading_zero}$)`),
                        '{position:leading_zero}'
                      )
                      .replace(
                        new RegExp(`(^${track_index}|${track_index}$)`),
                        '{position:index}'
                      ),
            line_text: item,
            position: track_position,
            artist: track_artist,
            duration: track_duration,
            track_name: track_title,
            track_index: track_index
          });
      }, []);

      var recognition_rule_query_string = `
        INSERT
        INTO recognition_masks ("item_sh_key", "recognition_result")
        VALUES ('${item.sh_key}', '${JSON.stringify(recognition_mask).replace(/'/ig, "''")}');
      `;
      if(process.env['NODE_ENV'] !== 'production'){
        console.log(recognition_rule_query_string);
      } else {
        db.run(recognition_rule_query_string, (err, items) => {
          if(err){ log.error(err); }
          log.info(`recognition mask added for item #${item.sh_key}`);
        });
      }
    }
    return true;
  }).catch(e => log.error(e));
}


module.exports = postprocess;
