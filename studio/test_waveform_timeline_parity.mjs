import assert from 'node:assert/strict';
import WaveformEngine from './waveform-engine.js';

assert.equal(WaveformEngine.canonicalTrack('04'),4);
assert.equal(WaveformEngine.canonicalTrack('+06.0'),6);
assert.equal(WaveformEngine.canonicalTrack('-0'),0);
assert.equal(WaveformEngine.canonicalTrack(false),null);
assert.equal(WaveformEngine.canonicalTrack(''),null);
assert.equal(WaveformEngine.canonicalTrack('4.5'),null);
assert.equal(WaveformEngine.canonicalTrack(7),null);
assert.equal(WaveformEngine.isAudioTrack('05'),true);
assert.equal(WaveformEngine.isAudioTrack(false),false);

assert.equal(WaveformEngine.canonicalId(0),'0');
assert.equal(WaveformEngine.canonicalId('007'),'7');
assert.equal(WaveformEngine.canonicalId('+07.000'),'7');
assert.equal(WaveformEngine.canonicalId('-0'),'0');
assert.equal(WaveformEngine.canonicalId(false),null);
assert.equal(WaveformEngine.canonicalId({id:7}),null);
assert.equal(WaveformEngine.sameIdentity(7,'007'),true);
assert.equal(WaveformEngine.sameIdentity('Voice','voice'),false);
assert.equal(WaveformEngine.findById([{id:0},{id:'007'},{id:'Voice'}],'+07.0')?.id,'007');

const full=Array.from({length:100},(_,i)=>i/99);
let slice=WaveformEngine.slicePeaks(full,{sourceOffset:20,clipDuration:20,speed:1,sourceDuration:100,bins:10});
assert.equal(slice.length,10);
assert.ok(slice[0]>=0.2&&slice[0]<0.24,'trimmed waveform should begin near the source offset');
assert.ok(slice.at(-1)>0.37&&slice.at(-1)<0.41,'trimmed waveform should end near the edited out point');

slice=WaveformEngine.slicePeaks(full,{sourceOffset:20,clipDuration:20,speed:2,sourceDuration:100,bins:10});
assert.ok(slice.at(-1)>0.56&&slice.at(-1)<0.61,'speed must expand the consumed source window');

const capped=WaveformEngine.sourceWindow({sourceOffset:90,clipDuration:20,speed:2,sourceDuration:100});
assert.deepEqual(capped,{start:90,end:100,duration:10,speed:2,sourceDuration:100});

const engine=new WaveformEngine();
const blobA={};const blobB={};
assert.equal(engine.blobKey(blobA),engine.blobKey(blobA),'same Blob identity must reuse cache token');
assert.notEqual(engine.blobKey(blobA),engine.blobKey(blobB),'replacement Blob must invalidate cached waveform even when media ID is unchanged');

console.log('timeline waveform parity regression: ok');
