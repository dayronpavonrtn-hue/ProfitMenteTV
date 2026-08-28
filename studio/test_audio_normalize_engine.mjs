import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);const Engine=require('./audio-normalize-engine.js');

const quiet=new Float32Array(48000);for(let i=0;i<quiet.length;i++)quiet[i]=Math.sin(i/12)*.1;
let m=Engine.analyzeChannels([quiet]);
assert.ok(m.peak>.099&&m.peak<=.101);assert.ok(m.rms>.069&&m.rms<.072);assert.equal(m.samples,48000);
let r=Engine.recommendation(m,4,1);assert.equal(r.ok,true);assert.ok(r.volume>1.7&&r.volume<1.9);assert.equal(r.target.rmsDb,-18);assert.equal(r.limitedByPeak,false);

const hot=new Float32Array(1000);hot.fill(.95);m=Engine.analyzeChannels([hot]);r=Engine.recommendation(m,4,1);assert.equal(r.ok,true);assert.equal(r.limitedByPeak,true);assert.ok(r.volume<.95&&r.volume>.93);

const silence=new Float32Array(1000);r=Engine.recommendation(Engine.analyzeChannels([silence]),4,.8);assert.equal(r.ok,false);assert.equal(r.reason,'silence');assert.equal(r.volume,.8);

assert.deepEqual(Engine.targets(4),{rmsDb:-18,peakDb:-1,label:'voz'});assert.deepEqual(Engine.targets(5),{rmsDb:-24,peakDb:-1,label:'música'});assert.deepEqual(Engine.targets(6),{rmsDb:-20,peakDb:-1,label:'efectos'});
const w=Engine.clipWindow({speed:2,sourceOffset:3,duration:4},20);assert.deepEqual(w,{offset:3,sourceDuration:8,speed:2});
const limited=Engine.clipWindow({speed:2,sourceOffset:18,duration:4},20);assert.equal(limited.sourceDuration,2);

const left=new Float32Array([0,.25,.5,.25,0]),right=new Float32Array([0,.1,.2,.1,0]);m=Engine.analyzeChannels([left,right],1,4);assert.equal(m.samples,6);assert.equal(m.peak,.5);
console.log('audio normalize engine ok');
