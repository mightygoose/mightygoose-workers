"use strict"

const BaseRestorer = require('./base');
const MusicBrainzApi = require('musicbrainz-api').MusicBrainzApi;

const mbApi = new MusicBrainzApi({});

const searchMusicBranz = async (query) => {
  const result = await mbApi.search('release', { query });
  return result;
}

class MusicBrainzAlbumRestorer extends BaseRestorer {
  async request(item) {
    try {
      const response = await searchMusicBranz(item['title']);
      return response.releases;
    } catch (e) {
      console.error(e)
    }
  }
  get_title(restorer_item) {
    return `${restorer_item['artist-credit'][0].name} - ${restorer_item.title}`;
  }
  get_fields(restorer_item) {
    return {
      id: restorer_item.id,
      score: restorer_item.score,
      date: restorer_item.date,
      country: restorer_item.country,
      album: restorer_item.title,
      artist: restorer_item['artist-credit'][0].name,
    };
  }
}



module.exports = {
  AlbumRestorer: MusicBrainzAlbumRestorer,
}

