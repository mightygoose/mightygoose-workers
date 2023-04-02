"use strict"

const parser = require('./string_parser');
const EventEmitter = require('events');
const _ = require('lodash');


class StringAnalyser {
  constructor(initial_data, options){

    options || (options = {});
    let recalculation_time = options.recalculation_time || 100;

    this.masks = initial_data || [];
    this.masks_cache = {};
    this.data_statistics = {};
    this.matched_fields_statistics = {};
    this.stat = {};

    this.emitter = new EventEmitter();

    this.emitter.on('train', this.on_train.bind(this));
    this.emitter.on(
      'train',
      _.debounce(this.recalculate_weights.bind(this), recalculation_time)
    );
  }

  on(event_name, cbk){
    return this.emitter.on(event_name, cbk);
  }

  on_train(item){
    let string = item[0];
    let data = item[1];
    let mask = item[2];
    let mask_chunks;
    try {
      mask_chunks = parser.parse_string(mask, mask);
    } catch (e) {
      mask_chunks = [];
    }

    if(!mask_chunks.length){
      return false;
    }

    let index = this.masks_cache[mask];

    if(typeof index === 'undefined'){
      this.masks_cache[mask] = index = this.masks.push({
        mask: mask,
        count: 0,
        fields_match: Object.keys(mask_chunks[0]).length,
        weights: {
          common: 0
        }
      }) - 1;
    }

    Object.keys(data).forEach((key) => {
      this.data_statistics[key] || (this.data_statistics[key] = []);
      this.data_statistics[key].push(data[key]);
    });

    Object.keys(mask_chunks[0]).forEach((key) => {
      if(!data[key]){ return; }
      this.matched_fields_statistics[key] || (this.matched_fields_statistics[key] = []);
      this.matched_fields_statistics[key].push(data[key]);
    });

    this.masks[index].count++;
  }

  train(string, data, mask){
    let response = [].concat(typeof string === 'string' ? [[string, data, mask]] : string).map((item) => {
      setTimeout(() => {
        this.emitter.emit('train', item);
      }, 0);
    });

    return response;
  }

  get_weight(x, x_max, x_min, k){
    /*

                    pi * (Xmin - x)
       1 + k * cos(-----------------)
                         Xmax
      -------------------------------
                    2

      k = (1, -1) - growing factor, (1 - decreases, -1 - grows)
      Xmin - minimux x value
      Xmax - maximum x value

    */

    x_min || (x_min = 0);
    k || (k = -1);

    return (1 + k * Math.cos((Math.PI * (x_min - x)) / x_max)) / 2;
  }

  recalculate_weights(){
    let max_fields_match = this.masks.reduce((acc, mask) => {
      return mask.fields_match > acc ? mask.fields_match : acc;
    }, 0);

    this.masks = this.masks.map((mask, index, masks) => {
      let unit_weight = mask.count / masks.reduce((acc, item) => acc + item.count, 0);
      //let unit_weight = this.get_weight(mask.count, masks.reduce((acc, item) => acc + item.count, 0));

      let reducing_weight = this.get_weight(masks.filter((to_compare) => {
        return parser.get_chunks(to_compare.mask, mask.mask);
      }).length, masks.length, 1, 1);

      let increasing_weight = this.get_weight(mask.fields_match, max_fields_match);
      return Object.assign({}, mask, {
        weights: {
          unit: unit_weight,
          reducing: reducing_weight,
          increasing: increasing_weight,
          common: unit_weight * reducing_weight * increasing_weight
        }
      });
    });

    this.stat = Object.keys(this.matched_fields_statistics).reduce((acc, key) => {
      acc[key] = {
        arithmetic_mean: this.data_statistics[key].reduce((acc, item) => {
          return acc + `${item}`.length;
        }, 0) / this.data_statistics[key].length,
        unit: this.matched_fields_statistics[key].length / this.data_statistics[key].length
      }
      return acc;
    }, {});

    this.emitter.emit('weights_updated');
  }

  classify_mask(string){
    return this.masks
               .filter(mask => parser.parse_string(string, mask.mask))
               .sort((a, b) => b.weights.common - a.weights.common);
  }

  parse_string(string){}

  get_structure(){
    return {
      count: this.masks.reduce((acc, mask) => acc + mask.count, 0),
      stat: this.stat,
      masks: this.masks.sort((a, b) => b.weights.common - a.weights.common)
    }
  }
}

module.exports = StringAnalyser;
