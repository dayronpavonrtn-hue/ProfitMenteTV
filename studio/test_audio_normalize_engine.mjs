import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);const Engine=require('./audio-normalize-engine.js');

const quiet=new Float32Array(48000);for(let i=0;i<quiet.length;i++)quiet[i]=Math.sin(i/12)*.1;
let m=Engine.analyzeChannels([quiet]);
assert.ok(m.peak>.099&&m.peak<=.101);assert.ok(m.rms>.069&&m.rms<.072);assert.equal(m.samples,48000);
// Studio canonical audio tracks are 4=SFX, 5=Música, 6=Voz. Voice normalization
// therefore uses track 6 and must remain stable when normalization is repeated.
let r=Engine.recommendation(m,6,1);assert.equal(r.ok,true);assert.ok(r.volume>1.7&&r.volume<1.9);assert.equal(r.target.rmsDb,-18);assert.equal(r.target.label,'voz');assert.equal(r.limitedByPeak,false);
const normalizedVolume=r.volume;
const rerun=Engine.recommendation(m,6,normalizedVolume);assert.equal(rerun.ok,true);assert.equal(rerun.volume,normalizedVolume);assert.ok(Math.abs(rerun.gain-1)<1e-9);
const fromLowDefault=Engine.recommendation(m,6,.22);assert.equal(fromLowDefault.volume,normalizedVolume);assert.ok(fromLowDefault.gain>7);

const transient=new Float32Array(1000);transient.fill(.02);transient[500]=.95;m=Engine.analyzeChannels([transient]);r=Engine.recommendation(m,6,1);assert.equal(r.ok,true);assert.equal(r.limitedByPeak,true);assert.ok(r.volume<.95&&r.volume>.93);

const silence=new Float32Array(1000);r=Engine.recommendation(Engine.analyzeChannels([silence]),6,.8);assert.equal(r.ok,false);assert.equal(r.reason,'silence');assert.equal(r.volume,.8);

assert.deepEqual(Engine.targets(4),{rmsDb:-20,peakDb:-1,label:'efectos'});assert.deepEqual(Engine.targets(5),{rmsDb:-24,peakDb:-1,label:'música'});assert.deepEqual(Engine.targets(6),{rmsDb:-18,peakDb:-1,label:'voz'});
const w=Engine.clipWindow({speed:2,sourceOffset:3,duration:4},20);assert.deepEqual(w,{offset:3,sourceDuration:8,speed:2});
const limited=Engine.clipWindow({speed:2,sourceOffset:18,duration:4},20);assert.equal(limited.sourceDuration,2);

const left=new Float32Array([0,.25,.5,.25,0]),right=new Float32Array([0,.1,.2,.1,0]);m=Engine.analyzeChannels([left,right],1,4);assert.equal(m.samples,6);assert.equal(m.peak,.5);

const clips=[
  {id:'sfx',track:4,asset:'s'},
  {id:'music',track:5,asset:'m'},
  {id:'voice',track:6,asset:'v'},
];
assert.deepEqual(Engine.activeAudioClips({clips}).map(c=>c.id),['sfx','music','voice']);
assert.deepEqual(Engine.activeAudioClips({clips,trackState:{5:{muted:true}}}).map(c=>c.id),['sfx','voice']);
assert.deepEqual(Engine.activeAudioClips({clips,trackState:{6:{solo:true}}}).map(c=>c.id),['voice']);
assert.deepEqual(Engine.activeAudioClips({clips,trackStates:{4:{solo:true}}}).map(c=>c.id),['sfx']);
assert.deepEqual(Engine.activeAudioClips({clips,trackState:{5:{muted:false}},trackStates:{5:{muted:true}}}).map(c=>c.id),['sfx','voice']);
assert.deepEqual(Engine.activeAudioClips({clips,trackState:{5:{solo:false}},trackStates:{5:{solo:true}}}).map(c=>c.id),['music']);
assert.deepEqual(Engine.activeAudioClips({clips:clips.map(c=>c.id==='sfx'?{...c,muted:true}:c)}).map(c=>c.id),['music','voice']);
assert.equal(Engine.trackActive({trackState:{5:{solo:true}}},4),false);
assert.equal(Engine.trackActive({trackState:{5:{solo:true}}},5),true);
assert.equal(Engine.trackActive({},3),false);

console.log('audio normalize engine ok');
