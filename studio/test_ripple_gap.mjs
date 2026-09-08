import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {ProfitMenteRippleGapEngine:E}=require('./ripple-gap-engine.js');
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);

const p={duration:12,clips:[
  {id:'v1',track:0,start:0,duration:2},
  {id:'a1',track:4,start:0,duration:2},
  {id:'v2',track:0,start:5,duration:3},
  {id:'a2',track:4,start:5,duration:3},
  {id:'title',track:2,start:9,duration:1}
],markers:[{id:'m1',time:1},{id:'m2',time:3},{id:'m3',time:10}],workRange:{start:3,end:11}};
let r=E.apply(p,3);assert.equal(r.ok,true);close(r.gap.start,2);close(r.gap.end,5);close(r.gap.duration,3);close(p.clips[2].start,2);close(p.clips[3].start,2);close(p.clips[4].start,6);close(p.duration,9);close(p.markers[0].time,1);close(p.markers[1].time,2);close(p.markers[2].time,7);close(p.workRange.start,2);close(p.workRange.end,8);

const noGap={duration:4,clips:[{id:'a',track:0,start:0,duration:4}]};r=E.apply(noGap,2);assert.equal(r.ok,false);assert.equal(r.reason,'no_gap');

const locked={duration:8,trackState:{0:{locked:true}},clips:[{id:'a',track:0,start:0,duration:2},{id:'b',track:0,start:4,duration:2}]};const lockedBefore=JSON.stringify(locked);r=E.apply(locked,3);assert.equal(r.ok,false);assert.equal(r.reason,'locked');assert.equal(JSON.stringify(locked),lockedBefore);
const clipLocked={duration:8,clips:[{id:'a',track:0,start:0,duration:2},{id:'b',track:0,start:4,duration:2,locked:true}]};const clipLockedBefore=JSON.stringify(clipLocked);r=E.apply(clipLocked,3);assert.equal(r.ok,false);assert.equal(r.reason,'locked');assert.equal(JSON.stringify(clipLocked),clipLockedBefore);

const splitGroup={duration:8,clips:[{id:'a',track:0,start:0,duration:2,groupId:'g'},{id:'b',track:4,start:4,duration:2,groupId:'g'}]};const groupBefore=JSON.stringify(splitGroup);r=E.apply(splitGroup,3);assert.equal(r.ok,false);assert.equal(r.reason,'group_spans_gap');assert.equal(JSON.stringify(splitGroup),groupBefore);
const sameSideGroup={duration:8,clips:[{id:'a',track:0,start:0,duration:2},{id:'b',track:0,start:4,duration:2,groupId:'g'},{id:'c',track:4,start:4.5,duration:1,groupId:'g'}]};r=E.apply(sameSideGroup,3);assert.equal(r.ok,true);close(sameSideGroup.clips[1].start,2);close(sameSideGroup.clips[2].start,2.5);

const tail={duration:10,clips:[{id:'a',track:0,start:0,duration:5}]};r=E.apply(tail,8);assert.equal(r.ok,true);assert.equal(r.changed,0);close(tail.duration,5);
for(const time of [true,false,[],[3],{},new Number(3),Symbol('3')]){const q={duration:8,clips:[{id:'a',track:0,start:0,duration:2},{id:'b',track:0,start:4,duration:2}]};const before=JSON.stringify(q);r=E.apply(q,time);assert.equal(r.ok,false);assert.equal(r.reason,'invalid_time');assert.equal(JSON.stringify(q),before)}

const ambiguous={duration:8,clips:[{id:7,track:0,start:0,duration:2},{id:'007',track:0,start:4,duration:2}]};const ambBefore=JSON.stringify(ambiguous);r=E.apply(ambiguous,3);assert.equal(r.ok,false);assert.equal(r.reason,'ambiguous_id');assert.equal(JSON.stringify(ambiguous),ambBefore);
for(const bad of [
  {duration:true,clips:[]},
  {duration:8,clips:[{id:'a',track:true,start:0,duration:2}]},
  {duration:8,clips:[{id:'a',track:0,start:{valueOf(){return 0}},duration:2}]},
  {duration:8,clips:[{id:'a',track:0,start:0,duration:[2]}]}
]){r=E.apply(bad,1);assert.equal(r.ok,false)}

const truthyLock={duration:8,trackState:{0:{locked:'true'}},clips:[{id:'a',track:0,start:0,duration:2},{id:'b',track:0,start:4,duration:2,locked:'true'}]};r=E.apply(truthyLock,3);assert.equal(r.ok,true);close(truthyLock.clips[1].start,2);
console.log('ripple gap tests passed');
