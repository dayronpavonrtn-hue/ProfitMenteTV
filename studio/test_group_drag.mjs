import assert from 'node:assert/strict';
import './group-drag-engine.js';
const {ProfitMenteGroupDragEngine}=globalThis;
const engine=new ProfitMenteGroupDragEngine();

const project={duration:10,clips:[
  {id:'v1',groupId:'g1',track:0,start:1,duration:2},
  {id:'o1',groupId:'g1',track:1,start:3,duration:1},
  {id:'x1',track:0,start:6,duration:1}
]};
const anchor=project.clips[0],originals=engine.snapshot(project,anchor);
assert.equal(originals.length,2,'group members must move as one unit');

let plan=engine.movePlan({duration:10,originals,anchorId:'v1',desiredStart:9,boundaries:[],snapSeconds:.15});
assert.equal(plan.delta,6,'group move must clamp using the latest group end');
assert.deepEqual(plan.moves.map(x=>x.start),[7,9]);
engine.apply(project,plan);
assert.equal(project.clips[0].start,7);assert.equal(project.clips[1].start,9);

const originals2=[{id:'v1',start:1,duration:2,track:0},{id:'o1',start:3,duration:1,track:1}];
plan=engine.movePlan({duration:10,originals:originals2,anchorId:'v1',desiredStart:4.92,boundaries:[5,8],snapSeconds:.15});
assert.equal(plan.snapped,true);assert.equal(plan.snapKind,'group-start');assert.equal(plan.moves[0].start,5);assert.equal(plan.moves[1].start,7);

plan=engine.movePlan({duration:10,originals:originals2,anchorId:'v1',desiredStart:2,desiredTrack:1,boundaries:[],canTrack:(_,next)=>next<=2});
assert.equal(plan.trackChanged,true);assert.deepEqual(plan.moves.map(x=>x.track),[1,2]);

plan=engine.movePlan({duration:10,originals:originals2,anchorId:'v1',desiredStart:2,desiredTrack:2,boundaries:[],canTrack:(_,next)=>next<=2});
assert.equal(plan.trackChanged,false,'invalid group track shift must be rejected atomically');assert.deepEqual(plan.moves.map(x=>x.track),[0,1]);

const lockedPlan=engine.movePlan({duration:10,originals:originals2,anchorId:'v1',desiredStart:-5,boundaries:[]});
assert.equal(lockedPlan.moves[0].start,0);assert.equal(lockedPlan.moves[1].start,2,'left clamp must preserve relative offsets');

console.log('group drag regression: ok');