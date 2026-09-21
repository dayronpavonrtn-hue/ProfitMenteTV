const assert=require('assert');
const {normalizeClipWindow}=require('./clip-boundary-engine.js');
assert.deepStrictEqual(normalizeClipWindow(10,5,45),{start:10,duration:5});
assert.deepStrictEqual(normalizeClipWindow(45,5,45),{start:44.75,duration:.25});
assert.deepStrictEqual(normalizeClipWindow(44.9,5,45),{start:44.75,duration:.25});
assert.deepStrictEqual(normalizeClipWindow(-4,5,45),{start:0,duration:5});
assert.deepStrictEqual(normalizeClipWindow(Infinity,Infinity,45),{start:0,duration:.25});
assert.deepStrictEqual(normalizeClipWindow('bad','bad',45),{start:0,duration:.25});
console.log('clip-boundary-engine: OK');
