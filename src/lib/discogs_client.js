const request = require('request');

const DISCOGS_TOKEN = process.env['DISCOGS_TOKEN'];

module.exports = {
  get_info(discogs_object){
    return new Promise((resolve, reject) => {
      request({
        url: `${discogs_object.resource_url}?token=${DISCOGS_TOKEN}`,
        headers: {
          'User-Agent': 'request'
        }
      }, (error, header, response) => {
        if(error){
          reject(error);
          return;
        }
        resolve(response);
      });
    })
    .then(response => JSON.parse(response))
    .then(response => {
      var main_artist = response.artists.map((artist) => artist.name).join(', ');
      return {
        title: response.title,
        artist: main_artist,
        year: response.year,
        uri: response.uri,
        images: response.images,
        tracklist: response.tracklist.map((item) => {
          return {
            duration: item.duration,
            position: item.position,
            title: item.title,
            artist: item.artists
                    ? item.artists.map((artist) => artist.name).join(', ')
                    : main_artist
          };
        })
      };
    });
  }
}
