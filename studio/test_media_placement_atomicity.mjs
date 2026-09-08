import assert from 'node:assert/strict';
import './media-placement-engine.js';

const Placement=globalThis.ProfitMenteMediaPlacementEngine;
assert.ok(Placement,'media placement engine must export');

assert.equal(Placement.trackKey(false),null,'boolean false must not alias track 0');
assert.equal(Placement.trackKey(true),null,'boolean true must not alias track 1');
assert.equal(Placement.trackKey([0]),null,'arrays must not alias a track');
assert.equal(Placement.trackKey(new Number(0)),null,'boxed numbers must not alias a track');
assert.equal(Placement.trackKey({valueOf(){return 0}}),null,'coercible objects must not alias a track');
assert.equal(Placement.trackKey(Symbol('0')),null,'symbols must be rejected without throwing');
assert.equal(Placement.trackKey('0.0'),'0','legacy numeric string aliases remain supported');
assert.equal(Placement.trackKey('06'),'6','legacy padded track aliases remain supported');
assert.equal(Placement.trackKey('-0'),'0','negative zero remains canonical track 0');
assert.equal(Placement.trackKey('1.5'),null,'fractional tracks are invalid');

assert.equal(Placement.trackLocked({trackState:{0:{locked:'true'}}},0),false,'truthy strings must not lock a track');
assert.equal(Placement.trackLocked({trackState:[]},0),false,'array track state is not a lock map');
assert.equal(Placement.trackLocked({trackState:{'0.0':{locked:true}}},0),true,'canonical numeric alias lock must work');
assert.equal(Placement.clipLocked({locked:'true'}),false,'truthy strings must not lock clips');
assert.equal(Placement.clipLocked({locked:true}),true,'boolean true locks clips');

assert.equal(Placement.range({duration:10},false,2).valid,false,'boolean playheads must not become zero');
assert.equal(Placement.range({duration:10},[2],2).valid,false,'array playheads must not be coerced');
assert.equal(Placement.range({duration:10},2,new Number(2)).valid,false,'boxed durations must not be coerced');
assert.equal(Placement.range({duration:'10'},'2.0','2').valid,true,'strict numeric strings remain compatible');

const failedInsert={duration:20,clips:[
  {id:'a',track:0,start:0,duration:10,asset:'a.mp4'},
  {id:'b',track:0,start:12,duration:2,asset:'b.mp4'}
]};
const failedInsertBefore=structuredClone(failedInsert);
const splitFailure={
  split(project){project.clips[0].duration=3;return null},
  trimLeft(){return false},trimRight(){return false}
};
const insertResult=Placement.insertSpace(failedInsert,0,4,2,splitFailure);
assert.equal(insertResult.ok,false);assert.equal(insertResult.reason,'split-failed');
assert.deepEqual(failedInsert,failedInsertBefore,'failed split must roll the insert transaction back completely');

const failedOverwrite={duration:20,clips:[{id:'a',track:0,start:0,duration:10,asset:'a.mp4'}]};
const failedOverwriteBefore=structuredClone(failedOverwrite);let splitCalls=0;
const secondSplitFailure={
  split(project,id,at){
    splitCalls++;
    const clip=project.clips.find(c=>c.id===id);
    if(splitCalls!==1||!clip)return null;
    const right={...clip,id:'right',start:at,duration:clip.start+clip.duration-at};
    clip.duration=at-clip.start;project.clips.push(right);return {left:clip,right};
  },
  trimLeft(){return false},trimRight(){return false}
};
const overwriteResult=Placement.overwriteRange(failedOverwrite,0,3,3,secondSplitFailure);
assert.equal(overwriteResult.ok,false);assert.equal(overwriteResult.reason,'split-failed');
assert.deepEqual(failedOverwrite,failedOverwriteBefore,'partial overwrite splits must roll back atomically');

const throwingInsert={duration:20,clips:[{id:'a',track:0,start:0,duration:5,asset:'a.mp4'}]};
const throwingInsertBefore=structuredClone(throwingInsert);
const throwingOps={split(){throw new Error('synthetic split failure')},trimLeft(){return true},trimRight(){return true}};
const thrownResult=Placement.insertSpace(throwingInsert,0,2,1,throwingOps);
assert.equal(thrownResult.ok,false);assert.equal(thrownResult.reason,'operation-failed');
assert.deepEqual(throwingInsert,throwingInsertBefore,'exceptions inside placement operations must not leave partial edits');

const trimFailure={duration:20,clips:[{id:'a',track:0,start:0,duration:6,asset:'a.mp4'}]};
const trimFailureBefore=structuredClone(trimFailure);
const failingTrimOps={split(){return null},trimLeft(){return false},trimRight(project,id){project.clips[0].duration=1;return false}};
const trimResult=Placement.overwriteRange(trimFailure,0,4,2,failingTrimOps);
assert.equal(trimResult.ok,false);assert.equal(trimResult.reason,'trim-failed');
assert.deepEqual(trimFailure,trimFailureBefore,'failed trim must roll the overwrite transaction back completely');

console.log('atomic media placement guard passed');
