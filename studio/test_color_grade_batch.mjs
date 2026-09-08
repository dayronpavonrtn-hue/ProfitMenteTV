import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {ProfitMenteColorGradeBatchEngine:g}=require('./color-grade-batch-engine.js');

assert.equal(g.identityKey(7),'n:7');
assert.equal(g.identityKey('007'),'n:7');
assert.equal(g.identityKey('+7.0'),'n:7');
assert.equal(g.identityKey('-0'),'n:0');
for(const bad of [true,false,null,undefined,[7],{toString(){return '7'}},new Number(7),Symbol('7')])assert.equal(g.identityKey(bad),null);
assert.equal(g.canonicalTrack('01'),1);
for(const bad of [true,[1],new Number(1),{},'1.5',7])assert.equal(g.canonicalTrack(bad),null);
assert.deepEqual(g.validatedPatch({brightness:'120',contrast:'-100'}),{brightness:100,contrast:-90});
for(const bad of [{brightness:[10]},{brightness:true},{brightness:new Number(10)},{unknown:1},{}])assert.equal(g.validatedPatch(bad),null);

const project={
  clips:[
    {id:'007',track:'00',brightness:0,contrast:0,saturation:0,hue:0},
    {id:'b',track:0,brightness:0,contrast:0,saturation:0,hue:0},
    {id:'c',track:1,brightness:0,contrast:0,saturation:0,hue:0},
    {id:'audio',track:4}
  ],
  trackState:{}
};
let r=g.applyPreset(project,'vivid',{scope:'selection',ids:[7,'b']});
assert.equal(r.changed,2);assert.equal(project.clips[0].contrast,14);assert.equal(project.clips[1].saturation,28);assert.equal(project.clips[2].contrast,0);
r=g.applyPatch(project,{brightness:'12',hue:'-5'},{scope:'track',track:'01'});
assert.equal(r.changed,1);assert.equal(project.clips[2].brightness,12);assert.equal(project.clips[2].hue,-5);
r=g.applyPreset(project,'mono',{scope:'all'});
assert.equal(r.changed,3);assert.equal(project.clips[0].saturation,-100);assert.equal(project.clips[2].saturation,-100);assert.equal(project.clips[3].saturation,undefined);

const locked={clips:[{id:1,track:0,brightness:0},{id:2,track:0,brightness:0}],trackState:{0:{locked:true}}};
r=g.applyPatch(locked,{brightness:20},{scope:'all'});
assert.equal(r.reason,'locked-targets');assert.equal(r.changed,0);assert.equal(locked.clips[0].brightness,0);assert.equal(locked.clips[1].brightness,0);
const fakeLock={clips:[{id:1,track:0,locked:'true',brightness:0}],trackState:{0:{locked:'true'}}};
r=g.applyPatch(fakeLock,{brightness:20},{scope:'all'});assert.equal(r.changed,1);assert.equal(fakeLock.clips[0].brightness,20);

const ambiguous={clips:[{id:7,track:0,brightness:0},{id:'007',track:0,brightness:0}]};
r=g.applyPatch(ambiguous,{brightness:30},{scope:'selection',ids:[7]});
assert.equal(r.reason,'ambiguous-id');assert.equal(r.changed,0);assert.equal(ambiguous.clips[0].brightness,0);assert.equal(ambiguous.clips[1].brightness,0);
const before=structuredClone(project);
r=g.applyPatch(project,{brightness:[99]},{scope:'all'});assert.equal(r.reason,'invalid-grade');assert.deepEqual(project,before);
assert.equal(g.applyPreset(project,'paid-cloud-look',{scope:'all'}).reason,'invalid-preset');
console.log('Batch color grading engine OK');
