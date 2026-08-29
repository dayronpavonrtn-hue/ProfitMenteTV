import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const Engine=require('./audio-waveform-engine.js');

const ch1=Float32Array.from([0,.2,-.5,.9,-1,.1,0,.4]);
const ch2=Float32Array.from([0,.1,.3,-.2,.2,.8,-.7,0]);
const peaks=Engine.buildPeaks([ch1,ch2],8);
assert.equal(peaks.length,8);
assert.ok(Math.abs(peaks[4]-1)<1e-6,'peak absoluto debe conservar máximo de canales');
assert.ok(Math.abs(peaks[5]-.8)<1e-6,'debe mezclar amplitud entre canales');

const silent=Engine.buildPeaks([],16);
assert.equal(silent.length,16);
assert.ok(Array.from(silent).every(v=>v===0));

assert.deepEqual(Engine.sourceWindow({sourceOffset:2,clipDuration:3,speed:2,sourceDuration:10}),{start:2,end:8,duration:6,speed:2,sourceDuration:10});
assert.deepEqual(Engine.sourceWindow({sourceOffset:8,clipDuration:3,speed:2,sourceDuration:10}),{start:8,end:10,duration:2,speed:2,sourceDuration:10});

const ramp=Float32Array.from({length:100},(_,i)=>i/99);
const early=Engine.slicePeaks(ramp,{sourceOffset:0,clipDuration:2,speed:1,sourceDuration:10,bins:20});
const late=Engine.slicePeaks(ramp,{sourceOffset:8,clipDuration:2,speed:1,sourceDuration:10,bins:20});
assert.equal(early.length,20);assert.equal(late.length,20);
assert.ok(late[0]>early.at(-1),'sourceOffset debe cambiar la ventana visible');

const normal=Engine.slicePeaks(ramp,{sourceOffset:2,clipDuration:2,speed:1,sourceDuration:10,bins:20});
const fast=Engine.slicePeaks(ramp,{sourceOffset:2,clipDuration:2,speed:2,sourceDuration:10,bins:20});
assert.ok(fast.at(-1)>normal.at(-1),'speed debe ampliar la ventana fuente representada');

const clamped=Engine.drawable([-1,.5,2,Number.NaN]);
assert.deepEqual(clamped,[0,.5,1,0]);
console.log('audio waveform regression: ok');
