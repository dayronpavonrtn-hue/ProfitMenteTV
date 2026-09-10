const assert=require('assert');
const Engine=require('./audio-qc-engine.js');
const rows=[
 {clip:{id:'voice',start:0,duration:4},effectivePeak:.72,dbfs:Engine.dbfs(.72),status:'ok'},
 {clip:{id:'music',start:1,duration:2},effectivePeak:.42,dbfs:Engine.dbfs(.42),status:'ok'},
 {clip:{id:'sfx',start:5,duration:1},effectivePeak:.3,dbfs:Engine.dbfs(.3),status:'ok'}
];
const mix=Engine.inspectMixOverlaps(rows);
assert.equal(mix.clipping,1,'voice + music must be flagged as a clipping mix segment');
assert.equal(mix.hot,0);
assert.ok(mix.worst);
assert.equal(mix.worst.start,1);
assert.equal(mix.worst.end,3);
assert.deepEqual(new Set(mix.worst.clipIds),new Set(['voice','music']));
assert.ok(mix.worst.effectivePeak>1);
const safe=Engine.inspectMixOverlaps([
 {clip:{id:'a',start:0,duration:2},effectivePeak:.2},
 {clip:{id:'b',start:1,duration:2},effectivePeak:.2}
]);
assert.equal(safe.clipping,0);
assert.equal(safe.hot,0);
const touching=Engine.inspectMixOverlaps([
 {clip:{id:'a',start:0,duration:1},effectivePeak:.9},
 {clip:{id:'b',start:1,duration:1},effectivePeak:.9}
]);
assert.equal(touching.segments.length,0,'touching clips must not be treated as overlapping');
console.log('Audio QC overlap mix regression OK');
