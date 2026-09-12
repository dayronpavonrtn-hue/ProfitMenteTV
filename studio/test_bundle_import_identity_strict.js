'use strict';
const assert=require('assert');
const guard=require('./bundle-import-identity-guard.js');

assert.strictEqual(guard.canonicalMediaId(1),'1');
assert.strictEqual(guard.canonicalMediaId('01'),'1');
assert.strictEqual(guard.canonicalMediaId(' 001 '),'1');
assert.strictEqual(guard.canonicalMediaId('asset-01'),'asset-01');
assert.strictEqual(guard.canonicalMediaId(1.5),'');
assert.strictEqual(guard.canonicalMediaId(NaN),'');

assert.throws(()=>guard.validateRestoredBundle({
  project:{clips:[],assets:[{id:'1',name:'a'},{id:'01',name:'b'}]},
  assets:[{id:'1',name:'a'},{id:'01',name:'b'}]
}),/duplicado o ambiguo/i);

const restored=guard.validateRestoredBundle({
  project:{clips:[{id:'c1',asset:'001'}],assets:[{id:1,name:'video.mp4'}]},
  assets:[{id:'1',name:'video.mp4'}]
});
assert.strictEqual(restored.assets[0].id,'1');
assert.strictEqual(restored.project.assets[0].id,'1');
assert.strictEqual(restored.project.clips[0].asset,'1');

assert.throws(()=>guard.validateRestoredBundle({
  project:{clips:[{id:'c1',asset:'missing'}],assets:[{id:'asset-a',name:'video.mp4'}]},
  assets:[{id:'asset-a',name:'video.mp4'}]
}),/no existe/i);

console.log('bundle import identity strict regression: ok');
