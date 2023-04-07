"use strict"

const BaseRestorer = require('./base');

const request = require('request');

const URL_BASE = 'https://api.deezer.com/search/album';

class DeezerAlbumRestorer extends BaseRestorer {
  request(item){
    return new Promise((resolve, reject) => {
      var title = item.title.replace(/ /ig, '+');
      request(`${URL_BASE}&q=${encodeURIComponent(title)}`, (error, header, response) => {
        if(response === 'HTTP_NOT_FOUND'){
          reject(response);
          return;
        }
        if(error){
          reject(error);
          return;
        }
        resolve(response);
      });
    })
    .then(response => JSON.parse(response))
    .then(response => response.data);
  }
  get_title(restorer_item){
    return `${restorer_item.artist.name} - ${restorer_item.title}`;
  }
  get_fields(restorer_item){
    return {
      track_count: restorer_item.nb_tracks,
      artist: restorer_item.artist.name,
      album: restorer_item.title,
      deezer_link: restorer_item.link,
      tracklist_url: restorer_item.tracklist,
      id: restorer_item.id
    };
  }
}


const TRACK_URL_BASE = 'https://api.deezer.com/search/track';

class DeezerTrackRestorer extends BaseRestorer {
  request(item){
    return new Promise((resolve, reject) => {
      var title = `${this.get_item_title(item).replace(/ /ig, '+')}`;
      request(`${TRACK_URL_BASE}?q=${encodeURIComponent(title)}`, (error, header, response) => {
        if(response === 'HTTP_NOT_FOUND'){
          reject(response);
          return;
        }
        if(error){
          reject(error);
          return;
        }
        resolve(response);
      });
    })
    .then(response => JSON.parse(response))
    .then(response => response.data);
  }
  get_item_title(item){
    return `${item.artist} - ${item.title}`;
  }
  get_title(restorer_item){
    return `${restorer_item.artist.name} - ${restorer_item.title}`;
  }
  get_fields(restorer_item, item){
    var original_title = this.get_item_title(item);
    return {
      type: restorer_item.type,
      track_id: restorer_item.id,
      artist: restorer_item.artist.name,
      track: restorer_item.title,
      album_id: restorer_item.album.id,
      album_name: restorer_item.album.title,
      original_title: original_title,
      original_position: (item || {}).position || null
    };
  }
}

module.exports = {
  AlbumRestorer: DeezerAlbumRestorer,
  TrackRestorer: DeezerTrackRestorer
}


