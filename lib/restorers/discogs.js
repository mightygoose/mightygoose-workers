"use strict"

const BaseRestorer = require('./base');

const _ = require('lodash');
const request = require('request');
const qs = require('qs');

const DISCOGS_TOKEN = process.env['DISCOGS_TOKEN'];


class DiscogsAlbumRestorer extends BaseRestorer {
  request(item){
    return new Promise((resolve, reject) => {
      var query_string = qs.stringify({
        'type' : 'release',
        'token' : DISCOGS_TOKEN
      });
      var url = 'https://api.discogs.com/database/search?' + query_string + '&q=' + encodeURI(item['title']);
      request({
        url: url,
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
    .then(response => response.results)
    .then(results => [].concat(
      results.find((el, index) => ~['release', 'master'].indexOf(el.type)) || []
    ));
  }

  get_title(restorer_item){
    return restorer_item.title;
  }
  get_fields(restorer_item){
    return restorer_item;
  }
}

module.exports = {
  AlbumRestorer: DiscogsAlbumRestorer
}
