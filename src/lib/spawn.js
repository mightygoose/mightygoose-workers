//spawn wrapper from https://davidwalsh.name/async-generators
module.exports = function(generator){
  var it = generator(), ret;

  (function iterate(val){
    try {
      ret = it.next(val);
      if (!ret.done){
        if ("then" in ret.value) {
          ret.value.then(iterate);
        }
        else {
          setTimeout(function(){
            iterate(ret.value);
          }, 0);
        }
      }
    } catch(e) {
      console.error(e);
      throw new Error(e);
    }
  })();
}
