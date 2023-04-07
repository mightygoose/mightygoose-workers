const assert = require('assert');

const parser = require('lib/string_parser');

const cases = [
  {
    structure: [
      {
        "type": "pattern",
        "value": "album",
      }
    ],
    mask: '{album}',
    strings: {
      'Album': {
        positions: [],
        chunks: {
          album: ['Album']
        }
      },
    }
  },
  {
    structure: [
      {
        "type": "pattern",
        "value": "artist",
      },
      {
        "type": "delimiter",
        "value": " - ",
      },
      {
        "type": "pattern",
        "value": "album",
      },
      {
        "type": "delimiter",
        "value": " (",
      },
      {
        "type": "pattern",
        "value": "year",
      },
      {
        "type": "delimiter",
        "value": ")",
      }
    ],
    mask: '{artist} - {album} ({year})',
    strings: {
      'Artist - Album (2014)': {
        positions: [[6], [14], [20]],
        chunks: {
          artist: ['Artist'],
          album: ['Album'],
          year: ['2014']
        }
      },
      'Artist - Middle - Album (2014)': {
        positions: [[6, 15], [23], [29]],
        chunks: {
          artist: ['Artist', 'Artist - Middle'],
          album: ['Middle - Album', 'Album'],
          year: ['2014']
        }
      },
      'Ab - Cd - Ef - Gh - Ij (2014)': {
        positions: [[2, 7, 12, 17], [22], [28]],
        chunks: {
          artist: ['Ab', 'Ab - Cd', 'Ab - Cd - Ef', 'Ab - Cd - Ef - Gh'],
          album: ['Cd - Ef - Gh - Ij', 'Ef - Gh - Ij', 'Gh - Ij', 'Ij'],
          year: ['2014']
        }
      },
      'Album 2014': false,
      'Artist - Album 2014': false
    }
  },
  {
    structure: [
      {
        "type": "pattern",
        "value": "artist",
      },
      {
        "type": "delimiter",
        "value": " - ",
      },
      {
        "type": "pattern",
        "value": "album",
      },
      {
        "type": "delimiter",
        "value": " - ",
      },
      {
        "type": "pattern",
        "value": "year",
      }
    ],
    mask: '{artist} - {album} - {year}',
    strings: {
      'Artist - Album - 2014': {
        positions: [[6], [14]],
        chunks: {
          artist: ['Artist'],
          album: ['Album'],
          year: ['2014']
        }
      },
      'Artist - Middle - Album - 2014': {
        positions: [[6, 15], [15, 23]],
        chunks: {
          artist: ['Artist', 'Artist - Middle'],
          album: ['Middle', 'Middle - Album', 'Album'],
          year: ['Album - 2014', '2014']
        }
      },
      'Artist - Middle - Foobar - Barbaz - 2014': {
        positions: [[6, 15, 24], [15, 24, 33]],
        chunks: {
          artist: ['Artist', 'Artist - Middle', 'Artist - Middle - Foobar'],
          album: ['Middle', 'Middle - Foobar', 'Middle - Foobar - Barbaz', 'Foobar', 'Foobar - Barbaz', 'Barbaz'],
          year: ['Foobar - Barbaz - 2014', 'Barbaz - 2014', '2014']
        }
      },
    }
  },
  {
    structure: [
      {
        "type": "pattern",
        "value": "artist",
      },
      {
        "type": "delimiter",
        "value": " - ",
      },
      {
        "type": "pattern",
        "value": "album",
      },
      {
        "type": "delimiter",
        "value": " ",
      },
      {
        "type": "pattern",
        "value": "year",
      }
    ],
    mask: '{artist} - {album} {year}',
    strings: {
      'Artist - Album 2014': {
        positions: [[6], [14]],
        chunks: {
          artist: ['Artist'],
          album: ['Album'],
          year: ['2014']
        }
      },
      'Artist - Middle - Album 2014': {
        positions: [[6, 15], [23]],
        chunks: {
          artist: ['Artist', 'Artist - Middle'],
          album: ['Middle - Album', 'Album'],
          year: ['2014']
        }
      },
      'Ab - Cd - Ef - Gh - Ij 2014': {
        positions: [[2, 7, 12, 17], [22]],
        chunks: {
          artist: ['Ab', 'Ab - Cd', 'Ab - Cd - Ef', 'Ab - Cd - Ef - Gh'],
          album: ['Cd - Ef - Gh - Ij', 'Ef - Gh - Ij', 'Gh - Ij', 'Ij'],
          year: ['2014']
        }
      }
    }
  },
  {
    structure: [
      {
        "type": "pattern",
        "value": "year",
      },
      {
        "type": "delimiter",
        "value": " ",
      },
      {
        "type": "pattern",
        "value": "artist",
      },
      {
        "type": "delimiter",
        "value": " - ",
      },
      {
        "type": "pattern",
        "value": "album",
      }
    ],
    mask: '{year} {artist} - {album}',
    strings: {
      '2014 Artist - Album': {
        positions: [[4], [11]],
        chunks: {
          year: ['2014'],
          artist: ['Artist'],
          album: ['Album']
        }
      },
      '2014 Artist - Middle - Album': {
        positions: [[4], [11, 20]],
        chunks: {
          year: ['2014'],
          artist: ['Artist', 'Artist - Middle'],
          album: ['Middle - Album', 'Album']
        }
      },
      '2014 Ab - Cd - Ef - Gh - Ij': {
        positions: [[4], [7, 12, 17, 22]],
        chunks: {
          year: ['2014'],
          artist: ['Ab', 'Ab - Cd', 'Ab - Cd - Ef', 'Ab - Cd - Ef - Gh'],
          album: ['Cd - Ef - Gh - Ij', 'Ef - Gh - Ij', 'Gh - Ij', 'Ij']
        }
      }
    }
  }
]


describe('StringParser Module', () => {
  cases.forEach((sample) => {
    describe(`${sample.mask}`, () => {
      var mask_structure = parser.parse_mask(sample.mask);
      it('Mask Parser', () => {
        assert.deepEqual(mask_structure, sample.structure);
      });
      describe('Cases:', () => {
        Object.keys(sample.strings).forEach((string) => {
          describe(`${string}`, () => {
            var structure = parser.analyse_string(string, mask_structure);
            var chunks = parser.get_chunks(string, sample.mask);
            var sample_result = sample['strings'][string];
            if(sample_result === false){
              it('doesnt match', () => {
                assert.equal(structure, sample_result);
                assert.equal(chunks, sample_result);
              });
            } else {
              it('String Analyser', () => {
                assert.deepEqual(
                  structure.filter((item) => item.type === 'delimiter')
                           .map((item) => item.positions),
                  sample_result.positions
                );
              });
              it('String Chunkyfier', () => {
                assert.deepEqual(chunks, sample_result.chunks);
              });
            }
          });
        });
      });
    });
  });
});

