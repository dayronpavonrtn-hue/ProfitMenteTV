import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const QC=require('../audio-qc-engine.js');
const waveform={slicePeaks:()=>[0.2,0.4]};
const base={id:'clip',start:0,duration:1,sourceOffset:0,speed:1};
for(const track of [-1,7,1.5,true,false,'voice','',NaN,Infinity,-Infinity]){
  const result=QC.inspectClip({clip:{...base,track},peaks:[0.2,0.4],sourceDuration:2,waveformEngine:waveform});
  assert.equal(result.status,'unavailable',`track ${String(track)} must be unavailable`);
  assert.equal(result.reason,'invalid_track',`track ${String(track)} must fail as invalid_track`);
  assert.equal(result.track,null);
}
for(const track of [0,1,4,5,6,'0','6']){
  const result=QC.inspectClip({clip:{...base,track},peaks:[0.2,0.4],sourceDuration:2,waveformEngine:waveform});
  assert.notEqual(result.status,'unavailable',`track ${String(track)} must remain valid`);
  assert.equal(result.track,Number(track));
}
console.log('audio-qc-invalid-track-regression: PASS');
