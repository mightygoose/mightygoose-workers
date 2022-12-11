// module is deprecated


const btc = require('bloom-text-compare');

const S_DIGITAL_CONSUMER_KEY = process.env['S_DIGITAL_CONSUMER_KEY'];
const S_DIGITAL_CONSUMER_SECRET = process.env['S_DIGITAL_CONSUMER_SECRET'];

const api = require('7digital-api').configure({
  consumerkey: S_DIGITAL_CONSUMER_KEY,
  consumersecret: S_DIGITAL_CONSUMER_SECRET,
  defaultParams: {
    country: 'de'
  }
});

var releases = new api.Releases();

module.exports = (item) => {
  return new Promise((resolve, reject) => {
    releases.search({q: item.title}, (error, data) => {
      if(error){
        reject(error);
        return;
      }
      resolve(data);
    });
  })
  .then(data => data.searchResults.searchResult)
  .then((results) => {
    if(!results.length){ return null; }
    var item_title = item.title.toLowerCase();

    var s_digital_item = results[0].release;
    var s_digital_title = `${s_digital_item.artist.name} - ${s_digital_item.title}`.toLowerCase();
    var similarity;
    if(item_title === s_digital_title){
      similarity = 1;
    } else {
      var hash1 = btc.hash(s_digital_title.split(' '));
      var hash2 = btc.hash(item_title.split(' '));
      var similarity = btc.compare(hash1, hash2);
      if(similarity < 0.5){ return null; }
    }
    return {
      track_count: s_digital_item.trackCount,
      price: s_digital_item.price.value,
      currency: s_digital_item.price.currency.code,
      artist: s_digital_item.artist.name,
      album: s_digital_item.title,
      similarity: similarity,
      id: s_digital_item.id
    }
  }).catch(() => {});
};
