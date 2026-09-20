import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const QC=require('../audio-qc-engine.js');
const waveform={slicePeaks:()=>[0.2,0.4]};
const base={id:'clip',start:0,duration:1,sourceOffset:0,speed:1};
const inspect=(project,clip)=>QC.inspectClip({project,clip,peaks:[0.2,0.4],sourceDuration:2,waveformEngine:waveform});
for(const sourceVolume of [-1,2.1,true,false,'',NaN,Infinity,-Infinity,'loud']){
  const result=inspect(null,{...base,track:0,sourceVolume});
  assert.equal(result.status,'unavailable',`sourceVolume ${String(sourceVolume)} must be unavailable`);
  assert.equal(result.reason,'invalid_gain');
}
for(const volume of [-1,2.1,true,false,'',NaN,Infinity,-Infinity,'loud']){
  const result=inspect(null,{...base,track:5,volume});
  assert.equal(result.status,'unavailable',`volume ${String(volume)} must be unavailable`);
  assert.equal(result.reason,'invalid_gain');
}
for(const gain of [-1,2.1,true,false,'',NaN,Infinity,-Infinity,'loud']){
  const result=inspect({trackState:{5:{gain}}},{...base,track:5,volume:.2});
  assert.equal(result.status,'unavailable',`track gain ${String(gain)} must be unavailable`);
  assert.equal(result.reason,'invalid_gain');
}
for(const value of [0,1,2,'0','1.5','2']){
  assert.notEqual(inspect(null,{...base,track:0,sourceVolume:value}).status,'unavailable');
  assert.notEqual(inspect(null,{...base,track:5,volume:value}).status,'unavailable');
  assert.notEqual(inspect({trackState:{5:{gain:value}}},{...base,track:5,volume:.2}).status,'unavailable');
}
console.log('audio-qc-invalid-gain-regression: PASS');
