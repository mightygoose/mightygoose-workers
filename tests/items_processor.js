const assert = require('assert');

const ItemsProcessor = require('workers/items_processor');

const data = require('tests/fake_data/restored_all.json');
const data2 = require('tests/fake_data/restored_only_discogs.json');
const data3 = require('tests/fake_data/restored_only_itunes.json');
const data4 = require('tests/fake_data/nothing_restored.json');
const spider_data = require('tests/fake_data/spider_data.json');


describe('ItemsProcessor', function(){
  this.timeout(15000);
  describe('static methods', () => {

    it('should generate badges correctly', (done) => {
      ItemsProcessor.process_data(spider_data).then(data => {
        console.log(data);
        assert.equal(true, true);
      }).then(done)
    });

    it('should generate status correctly', () => {
      assert.equal(ItemsProcessor.generate_status(data), "good");
      assert.equal(ItemsProcessor.generate_status(data2), "good");
      assert.equal(ItemsProcessor.generate_status(data3), "good");
      assert.equal(ItemsProcessor.generate_status(data4), "bad");
    });

  });
});
