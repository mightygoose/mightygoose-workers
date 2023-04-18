"use strict"

const BaseRestorer = require('./base');
const bandcamp = require('bandcamp-scraper')

const searchBandcamp = async (query) => {
  return new Promise((resolve, reject) => {
    bandcamp.search({
      query,
      page: 1
    }, function(error, searchResults) {
      if (error) {
        reject(error);
      } else {
        resolve(searchResults);
      }
    })
  })
}

class BandcampAlbumRestorer extends BaseRestorer {
  async request(item) {
    try {
      const response = await searchBandcamp(item['title']);
      const albums = response.filter(({ type }) => type === 'album');
      return albums;
    } catch (e) {
      console.error(e)
    }
  }
  get_title(restorer_item) {
    return `${restorer_item.artist} - ${restorer_item.name}`;
  }
  get_fields(restorer_item) {
    return {
      ...restorer_item,
      album: restorer_item.name,
    };
  }
}



module.exports = {
  AlbumRestorer: BandcampAlbumRestorer,
}

