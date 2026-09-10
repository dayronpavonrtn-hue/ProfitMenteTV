import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const Engine=require('./visual-adjust-engine.js');
const engine=new Engine();

assert.deepEqual(engine.normalize(null),{brightness:100,contrast:100,saturation:100,grayscale:0});
assert.deepEqual(engine.normalize({brightness:-5,contrast:999,saturation:'150',grayscale:110}),{brightness:0,contrast:300,saturation:150,grayscale:100});
assert.equal(engine.eligible({type:'video'}),true);
assert.equal(engine.eligible({type:'image'}),true);
assert.equal(engine.eligible({type:'overlay'}),true);
assert.equal(engine.eligible({type:'audio'}),false);

const project={clips:[],trackStates:{1:{locked:false}}};
const clip={id:1,type:'video',track:1,start:0,duration:4,asset:7};project.clips.push(clip);
let result=engine.apply(project,clip,{brightness:120,contrast:90,saturation:80,grayscale:5});
assert.equal(result.ok,true);assert.equal(result.changed,true);
assert.deepEqual(clip.visualAdjustments,{brightness:120,contrast:90,saturation:80,grayscale:5});
assert.equal(engine.canvasFilter(clip),'brightness(120%) contrast(90%) saturate(80%) grayscale(5%)');

result=engine.apply(project,clip,{brightness:120});assert.equal(result.changed,false);
const identity={id:2,type:'image',track:1,visualAdjustments:{brightness:80}};
result=engine.apply(project,identity,{brightness:100,contrast:100,saturation:100,grayscale:0});
assert.equal(result.changed,true);assert.equal('visualAdjustments' in identity,false);

const locked={id:3,type:'video',track:1,locked:true,visualAdjustments:{brightness:80}};
assert.deepEqual(engine.apply(project,locked,{brightness:120}).reason,'locked');
assert.equal(locked.visualAdjustments.brightness,80);
const trackLocked={id:4,type:'image',track:2};project.trackStates[2]={locked:true};
assert.equal(engine.apply(project,trackLocked,{contrast:120}).reason,'locked');
const audio={id:5,type:'audio',track:1};assert.equal(engine.apply(project,audio,{brightness:120}).reason,'ineligible');

result=engine.reset(project,clip);assert.equal(result.ok,true);assert.equal(result.changed,true);assert.equal('visualAdjustments' in clip,false);
console.log('visual-adjust-engine regression: ok');