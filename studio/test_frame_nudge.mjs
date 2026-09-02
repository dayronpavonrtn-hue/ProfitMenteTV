import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {ProfitMenteFrameNudgeEngine:E}=require('./frame-nudge-engine.js');
const close=(a,b,m='')=>assert.ok(Math.abs(a-b)<1e-9,m||`${a} != ${b}`);

for(const fps of [24,30,60]){
  const p={fps,duration:10,clips:[{id:'a',track:0,start:1,duration:2}]};
  let r=E.apply(p,'a',1);assert.equal(r.ok,true);assert.equal(r.appliedFrames,1);close(p.clips[0].start,1+1/fps);assert.equal(r.extended,false);
  r=E.apply(p,'a',-1);assert.equal(r.ok,true);assert.equal(r.appliedFrames,-1);close(p.clips[0].start,1);close(p.duration,10);
}

const grouped={fps:30,duration:8,trackState:{1:{locked:false},3:{locked:false}},clips:[
  {id:'v',track:1,start:2,duration:2,groupId:'g1'},
  {id:'c',track:3,start:2.5,duration:1,groupId:'g1'}
]};
let r=E.apply(grouped,'v',10);assert.equal(r.changed,2);assert.equal(r.appliedFrames,10);close(grouped.clips[0].start,2+10/30);close(grouped.clips[1].start,2.5+10/30);
assert.equal(grouped.clips[0].duration,2,'nudge must not alter clip duration');assert.equal(r.extended,false);

// Right nudges should keep the requested frame move and grow the sequence instead
// of silently refusing an edit at the old project boundary.
const edge={fps:30,duration:5,clips:[{id:'a',track:0,start:4,duration:1}]};
r=E.apply(edge,'a',1);assert.equal(r.ok,true);assert.equal(r.appliedFrames,1);assert.equal(r.extended,true);close(edge.clips[0].start,4+1/30);close(edge.duration,5+1/30);
r=E.apply(edge,'a',9);assert.equal(r.ok,true);assert.equal(r.appliedFrames,9);assert.equal(r.extended,true);close(edge.clips[0].start,4+10/30);close(edge.duration,5+10/30);
r=E.apply(edge,'a',-300);assert.equal(r.ok,true);assert.equal(r.appliedFrames,-130);close(edge.clips[0].start,0);close(edge.duration,5+10/30,'left nudge must never shrink project duration');

const fractionalLeft={fps:30,duration:5,clips:[{id:'a',track:0,start:.01,duration:1}]};
r=E.apply(fractionalLeft,'a',-1);assert.equal(r.ok,false);assert.equal(r.reason,'boundary');assert.equal(r.appliedFrames,0);close(fractionalLeft.clips[0].start,.01);

const fractionalRight={fps:30,duration:5,clips:[{id:'a',track:0,start:3.95,duration:1}]};
r=E.apply(fractionalRight,'a',10);assert.equal(r.ok,true);assert.equal(r.appliedFrames,10);close(r.delta,10/30);close(fractionalRight.clips[0].start,3.95+10/30);assert.equal(r.extended,true);close(fractionalRight.duration,4.95+10/30);

// Every member of a group contributes to the new sequence end.
const groupedEdge={fps:24,duration:3,clips:[
  {id:'v',track:0,start:2,duration:1,groupId:'g'},
  {id:'title',track:2,start:2.25,duration:.5,groupId:'g'}
]};
r=E.apply(groupedEdge,'v',24);assert.equal(r.ok,true);assert.equal(r.changed,2);assert.equal(r.appliedFrames,24);assert.equal(r.extended,true);close(groupedEdge.duration,4);

const locked={fps:30,duration:10,trackState:{0:{locked:true}},clips:[{id:'a',track:0,start:1,duration:1}]};
r=E.apply(locked,'a',1);assert.equal(r.ok,false);assert.equal(r.reason,'locked');close(locked.clips[0].start,1);close(locked.duration,10);

const legacyLocked={fps:30,duration:5,trackStates:{0:{locked:true}},clips:[{id:'a',track:0,start:4,duration:1}]};
r=E.apply(legacyLocked,'a',1);assert.equal(r.ok,false);assert.equal(r.reason,'locked');close(legacyLocked.clips[0].start,4);close(legacyLocked.duration,5);

const lockedGroup={fps:30,duration:10,trackState:{3:{locked:true}},clips:[
  {id:'v',track:0,start:1,duration:1,groupId:'g'},
  {id:'c',track:3,start:1,duration:1,groupId:'g'}
]};
r=E.apply(lockedGroup,'v',1);assert.equal(r.ok,false);assert.equal(r.reason,'locked');close(lockedGroup.clips[0].start,1);

assert.equal(E.fps({fps:25}),30);assert.equal(E.fps({fps:60}),60);
console.log('frame nudge tests passed');
