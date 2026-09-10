import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {ProfitMenteVisualKeyframeEngine}=require('./visual-keyframe-engine.js');
const engine=new ProfitMenteVisualKeyframeEngine();

const project={duration:20,clips:[]};
const clip={id:'v1',track:0,start:2,duration:10,asset:'asset-1'};project.clips.push(clip);

assert.deepEqual(engine.stateAt(clip,0),{x:0,y:0,scale:1,rotation:0,opacity:1});
let result=engine.upsert(project,clip,0,{x:0,y:0,scale:1,rotation:0,opacity:1});
assert.equal(result.ok,true);assert.equal(result.count,1);
result=engine.upsert(project,clip,10,{x:100,y:-50,scale:2,rotation:90,opacity:.5});
assert.equal(result.count,2);
let mid=engine.stateAt(clip,5);
assert.equal(mid.x,50);assert.equal(mid.y,-25);assert.equal(mid.scale,1.5);assert.equal(mid.rotation,45);assert.equal(mid.opacity,.75);

result=engine.upsert(project,clip,5,{x:25,y:10,scale:1.25,rotation:20,opacity:.8});
assert.equal(result.count,3);
assert.equal(engine.stateAt(clip,5).x,25);
result=engine.upsert(project,clip,5.0004,{x:30,y:12,scale:1.3,rotation:22,opacity:.7});
assert.equal(result.count,3,'near-identical keyframe times must replace instead of duplicate');
assert.equal(engine.stateAt(clip,5).x,30);

const clamped={id:'v2',track:1,start:0,duration:3,asset:'a'};
assert.equal(engine.upsert(project,clamped,99,{x:999,y:-999,scale:99,opacity:-1,rotation:99999}).keyframe.time,3);
const end=engine.stateAt(clamped,3);
assert.equal(end.x,200);assert.equal(end.y,-200);assert.equal(end.scale,8);assert.equal(end.opacity,0);assert.equal(end.rotation,3600);

const audioClip={id:'a1',track:5,start:0,duration:5,asset:'music'};
assert.equal(engine.upsert(project,audioClip,0,{}).reason,'not-visual');
const lockedClip={id:'locked',track:0,start:0,duration:5,asset:'x',locked:true};
assert.equal(engine.upsert(project,lockedClip,0,{}).reason,'locked');
const trackLockedProject={trackState:{1:{locked:true}}};
const trackLockedClip={id:'tl',track:1,start:0,duration:5,asset:'x'};
assert.equal(engine.upsert(trackLockedProject,trackLockedClip,0,{}).reason,'locked');

result=engine.remove(project,clip,5);
assert.equal(result.changed,true);assert.equal(result.count,2);
result=engine.remove(project,clip,5);
assert.equal(result.changed,false,'remove must not delete a distant keyframe');
result=engine.clear(project,clip);
assert.equal(result.changed,true);assert.equal(Array.isArray(clip.visualKeyframes),false);
assert.deepEqual(engine.stateAt(clip,5),{x:0,y:0,scale:1,rotation:0,opacity:1});

console.log('visual keyframe regression: ok');
