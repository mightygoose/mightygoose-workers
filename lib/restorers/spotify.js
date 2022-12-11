"use strict"

const pry = require('pryjs');

const BaseRestorer = require('./base');

const request = require('request');

const SpotifyWebApi = require('spotify-web-api-node');


const spotifyApi = new SpotifyWebApi({
  clientId : process.env['SPOTIFY_ID'],
  clientSecret : process.env['SPOTIFY_SECRET'],
});


class SpotifyAlbumRestorer extends BaseRestorer {

  constructor(){
    super();

    const updateToken = () => {
      this.authPromise = spotifyApi.clientCredentialsGrant()
        .then((data) => {
          console.log('The access token is ' + data.body['access_token']);

          spotifyApi.setAccessToken(data.body['access_token']);
          setTimeout(updateToken, data.body['expires_in'] * 1000);
        }, console.error);
    };

    updateToken();
  }

  request(item){
    return this.authPromise.then(() => spotifyApi.searchAlbums(item['title']))
    .then(response => response.body)
    .then(response => response.albums.items[0])
    .then(response => {
      if(!response){
        return [];
      }
      return spotifyApi.getAlbum(response.id);
    })
    .then(response => response.body)
    .then(response => [].concat(response))
    .catch(console.error)
  }
  get_title(restorer_item){
    return `${restorer_item.artists[0].name} - ${restorer_item.name}`;
  }
  get_fields(restorer_item){
    return {
      track_count: restorer_item.tracks.total,
      artist: restorer_item.artists[0].name,
      album: restorer_item.name,
      spotify_link: restorer_item.uri,
      api_link: restorer_item.href,
      id: restorer_item.id
    };
  }
}


//const TRACK_URL_BASE = 'https://itunes.apple.com/search?entity=song';

//class ItunesTrackRestorer extends BaseRestorer {
  //request(item){
    //return new Promise((resolve, reject) => {
      //var title = `${this.get_item_title(item).replace(/ /ig, '+')}`;
      //request(`${TRACK_URL_BASE}&term=${title}`, (error, header, response) => {
        //if(error){
          //reject(error);
          //return;
        //}
        //resolve(response);
      //});
    //})
    //.then(response => JSON.parse(response))
    //.then(response => response.results)
  //}
  //get_item_title(item){
    //return `${item.artist} - ${item.title}`;
  //}
  //get_title(restorer_item){
    //return `${restorer_item.artistName} - ${restorer_item.trackName}`;
  //}
  //get_fields(restorer_item, item){
    //var original_title = this.get_item_title(item);
    //return {
      //type: restorer_item.kind,
      //track_id: restorer_item.trackId,
      //artist: restorer_item.artistName,
      //track: restorer_item.trackName,
      //album_id: restorer_item.collectionId,
      //album_name: restorer_item.collectionName,
      //original_title: original_title,
      //original_position: (item || {}).position || null
    //};
  //}
//}

module.exports = {
  AlbumRestorer: SpotifyAlbumRestorer,
  //TrackRestorer: ItunesTrackRestorer
}

