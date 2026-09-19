import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const Engine=require('../audio-qc-engine.js');
const row=(id,start,duration,peak=.7)=>({clip:{id,track:4,start,duration},effectivePeak:peak});

const valid=Engine.inspectMixOverlaps([row('a',0,2),row('b',1,2)]);
assert.equal(valid.invalidTimingCount,0);
assert.equal(valid.clipping,1,'overlapping loud clips should still be detected');

for(const bad of [
  row('negative-start',-1,2),
  row('nan-start',NaN,2),
  row('infinite-start',Infinity,2),
  row('zero-duration',0,0),
  row('negative-duration',0,-1),
  row('nan-duration',0,NaN),
  row('infinite-duration',0,Infinity),
  row('overflow',Number.MAX_VALUE,Number.MAX_VALUE)
]){
  const mix=Engine.inspectMixOverlaps([bad,row('safe',0,1)]);
  assert.equal(mix.invalidTimingCount,1,`${bad.clip.id} must be surfaced as invalid timing`);
  assert.deepEqual(mix.invalidTiming,[bad.clip.id]);
  assert.equal(mix.segments.length,0,'invalid timing must not create fake overlap segments');
}

const serialized=Engine.inspectMixOverlaps([row('a','0','2'),row('b','1','2')]);
assert.equal(serialized.invalidTimingCount,0,'finite serialized timeline timing remains compatible');
assert.equal(serialized.clipping,1);
console.log('ProfitMente audio QC mix timing regression: OK');
