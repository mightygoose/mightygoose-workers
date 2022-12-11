"use strict"

const BaseRestorer = require('./base');

const request = require('request');

const URL_BASE = 'https://itunes.apple.com/search?entity=album';

class ItunesAlbumRestorer extends BaseRestorer {
  request(item){
    return new Promise((resolve, reject) => {
      var title = item.title.replace(/ /ig, '+');
      request(`${URL_BASE}&term=${title}`, (error, header, response) => {
        if(error){
          reject(error);
          return;
        }
        resolve(response);
      });
    })
    .then(response => JSON.parse(response))
    .then(response => response.results)
  }
  get_title(restorer_item){
    return `${restorer_item.artistName} - ${restorer_item.collectionName}`;
  }
  get_fields(restorer_item){
    return {
      track_count: restorer_item.trackCount,
      price: restorer_item.collectionPrice,
      currency: restorer_item.currency,
      artist: restorer_item.artistName,
      album: restorer_item.collectionName,
      collection_id: restorer_item.collectionId
    };
  }
}


const TRACK_URL_BASE = 'https://itunes.apple.com/search?entity=song';

class ItunesTrackRestorer extends BaseRestorer {
  request(item){
    return new Promise((resolve, reject) => {
      var title = `${this.get_item_title(item).replace(/ /ig, '+')}`;
      request(`${TRACK_URL_BASE}&term=${title}`, (error, header, response) => {
        if(error){
          reject(error);
          return;
        }
        resolve(response);
      });
    })
    .then(response => JSON.parse(response))
    .then(response => response.results)
  }
  get_item_title(item){
    return `${item.artist} - ${item.title}`;
  }
  get_title(restorer_item){
    return `${restorer_item.artistName} - ${restorer_item.trackName}`;
  }
  get_fields(restorer_item, item){
    var original_title = this.get_item_title(item);
    return {
      type: restorer_item.kind,
      track_id: restorer_item.trackId,
      artist: restorer_item.artistName,
      track: restorer_item.trackName,
      album_id: restorer_item.collectionId,
      album_name: restorer_item.collectionName,
      original_title: original_title,
      original_position: (item || {}).position || null
    };
  }
}

module.exports = {
  AlbumRestorer: ItunesAlbumRestorer,
  TrackRestorer: ItunesTrackRestorer
}

