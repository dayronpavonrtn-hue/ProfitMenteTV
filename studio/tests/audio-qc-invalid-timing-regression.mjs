import assert from 'node:assert/strict';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const Engine=require('../audio-qc-engine.js');
const wave={slicePeaks(){return [0.5]}};
const base={id:'voice-1',track:5,asset:'media-1',start:0,duration:2};
const inspect=(clip,sourceDuration=10)=>Engine.inspectClip({project:{clips:[clip]},clip,peaks:[0.5],sourceDuration,waveformEngine:wave});

assert.equal(inspect(base).status,'ok','valid timing remains analyzable');
for(const [field,value] of [
  ['duration',0],['duration',-1],['duration',NaN],['duration',Infinity],['duration','bad'],
  ['sourceOffset',-0.1],['sourceOffset',NaN],['sourceOffset',Infinity],['sourceOffset','bad'],
  ['speed',0],['speed',-1],['speed',NaN],['speed',Infinity],['speed','bad']
]){
  const result=inspect({...base,[field]:value});
  assert.equal(result.status,'unavailable',`${field}=${String(value)} must not produce a trusted QC result`);
  assert.equal(result.reason,'invalid_timing',`${field}=${String(value)} should report invalid_timing`);
}
for(const sourceDuration of [0,-1,NaN,Infinity,'bad']){
  const result=inspect(base,sourceDuration);
  assert.equal(result.status,'unavailable',`sourceDuration=${String(sourceDuration)} must be unavailable`);
  assert.equal(result.reason,'unknown_duration');
}
assert.equal(inspect({...base,sourceOffset:'1.25',duration:'2.5',speed:'1.5'}).status,'ok','serialized finite numeric timing remains compatible');
console.log('ProfitMente audio QC invalid timing regression: OK');
