const assert=require('node:assert/strict');
const Duration=require('../project-duration.js');

assert.equal(Duration.contentEnd({clips:null}),0);
assert.equal(Duration.contentEnd({clips:{length:99}}),0);
assert.doesNotThrow(()=>Duration.contentEnd({clips:[{start:Symbol('bad'),duration:2}]}));
assert.equal(Duration.contentEnd({clips:[{start:Symbol('bad'),duration:2}]}),2);
assert.equal(Duration.contentEnd({clips:[{start:Infinity,duration:Infinity}]}),0);
assert.equal(Duration.contentEnd({clips:[{start:3599,duration:50}]}),3600);
assert.deepEqual(Duration.outside({duration:10,clips:null}),[]);
assert.equal(Duration.outside({duration:10,clips:[{start:9,duration:2}]}).length,1);

const malformed={duration:Infinity,clips:[]};
assert.equal(Duration.sanitize(malformed),45);
assert.equal(malformed.duration,45);
const huge={duration:999999,clips:[]};
assert.equal(Duration.sanitize(huge),3600);
assert.equal(Duration.fit({duration:1,clips:[{start:3599,duration:99}]},{padding:999}),3600);

console.log('project-duration malformed regression: ok');