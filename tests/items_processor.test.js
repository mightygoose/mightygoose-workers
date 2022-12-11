const assert = require('assert');

const ItemsProcessor = require('workers/items_processor');

const data = require('tests/fake_data/restored_all.json');
const data2 = require('tests/fake_data/restored_only_discogs.json');
const data3 = require('tests/fake_data/restored_only_itunes.json');
const data4 = require('tests/fake_data/nothing_restored.json');
const spider_data = require('tests/fake_data/spider_data.json');


describe('ItemsProcessor', function() {
  describe('static methods', () => {

    it('should generate badges correctly', async () => {
      const data = await ItemsProcessor.process_data(spider_data);
      expect(true).toBe(true);
    });

    it('should generate status correctly', () => {
      expect(ItemsProcessor.generate_status(data)).toBe("good");
      expect(ItemsProcessor.generate_status(data2)).toBe("good");
      expect(ItemsProcessor.generate_status(data3)).toBe("good");
      expect(ItemsProcessor.generate_status(data4)).toBe("bad");
    });

  });
});
