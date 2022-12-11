"use strict";


//taken from http://stackoverflow.com/questions/15298912/javascript-generating-combinations-from-n-arrays-with-m-elements
function cartesian(arg) {
  var r = [], max = arg.length - 1;
  function helper(arr, i) {
    for(var j = 0, l = arg[i].length; j < l; j++){
      var a = arr.slice(0); // clone arr
      a.push(arg[i][j]);
      if(i == max){
        r.push(a);
      }
      else {
        helper(a, i + 1);
      }
    }
  }
  helper([], 0);
  return r;
}


class string_parser {

  static positions(string, substring){
    var splitted = string.split(substring);
    if(splitted.length === 1){ return [] }
    return splitted.slice(0, -1).reduce(function(acc, chunk){
      var position = chunk.length;
      if(acc.length){
        position += acc[acc.length - 1] + substring.length;
      }
      return acc.concat(position);
    }, []);
  }

  static parse_mask(mask){

    var splitter = "||" + (+(new Date())) + "||";

    var structure = mask.replace(
      /\{(.+?)\}/ig, splitter + 'key:$1' + splitter
    )
    .split(splitter)
    .filter((item) => {
      return item !== '';
    })
    .reduce((acc, item) => {
      return acc.concat({
        type: item.indexOf('key:') === 0 ? 'pattern' : 'delimiter',
        value: item.replace('key:', '')
      });
    }, []);

    return structure;
  }

  static analyse_string(string, structure){

    var regex = new RegExp(
      [].concat('^')
        .concat(structure.map((item) => {
          if(item.type === 'pattern'){
            return '(.*?)';
          } else {
            return item.value.replace(/([^0-9A-Za-z])/ig, '[\\$1]');
          }
        }))
        .concat('$')
        .join('')
    );
    if(!regex.test(string)){ return false; }

    return structure.map((item, item_index) => {
      if(item.type === 'pattern'){
        return item;
      }

      return Object.assign({}, item, {
        positions: this.positions(string, item.value).filter((position, position_index) => {

          var prev_delimiter = structure[item_index - 2];
          var next_delimiter = structure[item_index + 2];

          //filter same positions forwards
          if(next_delimiter){
            var next_delimiter_positions = this.positions(string, next_delimiter.value);
            var next_delimiter_first_position = next_delimiter_positions[0];
            var next_delimiter_last_position = next_delimiter_positions[next_delimiter_positions.length - 1];
            if(next_delimiter.value !== item.value){
              if(~item.value.indexOf(next_delimiter.value)){
                return position <= next_delimiter_last_position;
              }
              if(~next_delimiter.value.indexOf(item.value)){
                return position < next_delimiter_first_position;
              }
              return position <= next_delimiter_first_position;
            } else {
              if(item_index !== 0){
                return position <= next_delimiter_positions[position_index + 1];
              }
            }
          }
          //filter same positions backwards
          if(prev_delimiter){
            var prev_delimiter_positions = this.positions(string, prev_delimiter.value);
            var prev_delimiter_last_position = prev_delimiter_positions[prev_delimiter_positions.length - 1];
            if(prev_delimiter.value !== item.value){
              if(~item.value.indexOf(prev_delimiter.value)){
                return true;
              }
              if(~prev_delimiter.value.indexOf(item.value)){
                return position > prev_delimiter_last_position + prev_delimiter.value.length;
              }
              return position >= prev_delimiter_last_position;
            } else {
              if(item_index !== structure.length - 1){
                return position >= prev_delimiter_positions[position_index - 1];
              }
            }
          }
          return true;
        })
      });
    });

  }

  static get_chunks(string, mask){

    var structure = this.analyse_string(string, this.parse_mask(mask));

    return !structure ? false : structure.reduce((chunks, item, i) => {

      if(item.type !== 'pattern'){ return chunks; }

      var prev_item = structure[i - 1];
      var next_item = structure[i + 1];

      if(!prev_item && !next_item){
        chunks[item.value] = [].concat(string);
      }
      if(!prev_item && next_item){
        chunks[item.value] = next_item.positions.map((n_pos) => {
          return string.slice(0, n_pos);
        });
      }
      if(prev_item && next_item){
        chunks[item.value] = prev_item.positions.reduce((acc, p_pos) => {
          return acc.concat(next_item.positions.filter((n_pos) => n_pos !== p_pos && n_pos > p_pos).map((n_pos) => {
            return string.slice(p_pos + prev_item.value.length, n_pos);
          }))
        }, []);
      }
      if(prev_item && !next_item){
        chunks[item.value] = prev_item.positions.map((p_pos) => {
          return string.slice(p_pos + prev_item.value.length);
        });
      }

      return chunks;
    }, {});
  }

  //might be collisions here
  static parse_string(string, mask){

    var mask_structure = this.parse_mask(mask);
    var chunks = this.get_chunks(string, mask);

    if(chunks === false){ return false; }

    var keys = Object.keys(chunks);

    return cartesian(
      keys.map((key) => chunks[key])
    )
    .filter((item) => {
      return item.concat(
        mask_structure.filter((item) => item.type === 'delimiter').map((item) => item.value)
      ).join('').length === string.length;
    })
    //filtrate collisions here
    .map((item) => {
      return keys.reduce((acc, key, index) => {
        acc[key] = item[index];
        return acc;
      }, {});
    });
  }

  //should be moved to separate module
  static parse_massive(string, masks){
    return masks.map((item) => Object.assign(item, { weight: item.weight || 1 }))
    .map((item) => {
      //decrease weight of "strong" masks
      return Object.assign(item, {
        weight_prepared: masks.reduce((acc, to_compare) => {
          if(to_compare.mask === item.mask){
            return acc;
          }
          var p = this.parse_string(to_compare.mask, item.mask);
          if(!p){ return acc }
          return acc * to_compare.weight;
        }, item.weight)
      })
    })
    .map((item) => Object.assign(item, { weight_common: item.weight * item.weight_prepared }))
    .map((item) => {
      return Object.assign({}, item, {
        variants: this.parse_string(string, item.mask)
      })
    })
    .filter((item) => !!item.variants)
    .reduce((acc, item) => {
      return acc.concat(
        item.variants.map((variant) => Object.assign({}, variant, {
          weight: item.weight,
          weight_prepared: item.weight_prepared,
          weight_common: item.weight_common,
          fields_match: Object.keys(variant).length
        }))
      );
    }, [])
    .sort((a, b) => {
      if(a.fields_match === b.fields_match){
        var x = b.weight, y = a.weight;
        return x < y ? -1 : x > y ? 1 : 0;
      }
      return b.fields_match - a.fields_match;
    });
  }
}


module.exports = string_parser;
