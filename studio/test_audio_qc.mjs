import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const AudioQC=require('./audio-qc-engine.js');
const Wave=require('./audio-waveform-engine.js');

assert.equal(AudioQC.trackGain({},4),1,'missing track gain must default to unity');
assert.equal(AudioQC.trackGain({trackState:{'4':{gain:.5}}},4),.5);
assert.equal(AudioQC.trackGain({trackStates:{'04':{gain:1.5}}},4),1.5,'numeric track aliases must resolve');
assert.equal(AudioQC.clipGain({}, {track:5}),.22,'music default must match audio engine');
assert.equal(AudioQC.clipGain({}, {track:4}),1);
assert.equal(AudioQC.clipGain({}, {track:0,sourceVolume:.5}),.5);

const quiet=AudioQC.inspectPeaks([0,.25,.5],1);
assert.equal(quiet.status,'ok');
assert.ok(Math.abs(quiet.dbfs-(-6.020599913279624))<1e-9);
assert.equal(AudioQC.inspectPeaks([0,0],1).status,'silent');
assert.equal(AudioQC.inspectPeaks([.9],1).status,'hot');
assert.equal(AudioQC.inspectPeaks([1],1).status,'clipping');
assert.equal(AudioQC.inspectPeaks([.6],2).status,'clipping','effective gain must be included');

const peaks=new Float32Array(1000);peaks.fill(.2);peaks[550]=1;
const outside=AudioQC.inspectClip({project:{},clip:{id:'a',track:4,start:0,duration:2,sourceOffset:0,speed:1},peaks,sourceDuration:10,waveformEngine:Wave});
assert.equal(outside.status,'ok','source-window analysis must ignore peaks outside the clip');
const inside=AudioQC.inspectClip({project:{},clip:{id:'b',track:4,start:0,duration:2,sourceOffset:5,speed:1},peaks,sourceDuration:10,waveformEngine:Wave});
assert.equal(inside.status,'clipping','source-window analysis must include peaks inside the clip');
assert.equal(AudioQC.inspectClip({clip:{},peaks,sourceDuration:0,waveformEngine:Wave}).status,'unavailable');

const summary=AudioQC.summarize([{status:'ok'},{status:'hot'},{status:'clipping'},{status:'silent'},{status:'bad'}]);
assert.deepEqual(summary,{clipping:1,hot:1,ok:1,silent:1,unavailable:1,total:5,ok:false});
console.log('ProfitMente Studio Audio QC regressions: OK');
