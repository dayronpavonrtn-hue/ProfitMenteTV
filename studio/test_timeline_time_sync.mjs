import assert from 'node:assert/strict';
import './timeline-operations.js';
import './remove-time-integration.js';

const Ops=globalThis.ProfitMenteTimelineOperations;
assert.ok(Ops,'Timeline operations engine was not exported');
const ops=new Ops();

const project={duration:12,markers:[{id:'before',time:1},{id:'at',time:2},{id:'after',time:6}],workRange:{start:1,end:8},clips:[
  {id:'caption',track:3,start:2,duration:2,wordTimings:[
    {word:'uno',start:2.1,end:2.7},{word:'dos',start:3,end:3.8}
  ]},
  {id:'video',track:0,start:6,duration:2,asset:'v1'},
  {id:'music',track:5,start:9,duration:2,asset:'m1'}
]};
const inserted=ops.insertTime(project,'2','1.5');
assert.equal(inserted.ok,true);
assert.equal(inserted.moved,3);
assert.equal(inserted.wordsShifted,2,'caption word timings must move with the caption clip');
assert.equal(inserted.markersShifted,2,'markers at or after the insertion point must stay synchronized');
assert.equal(project.clips.find(c=>c.id==='caption').start,3.5);
assert.equal(project.clips.find(c=>c.id==='video').start,7.5);
assert.equal(project.clips.find(c=>c.id==='music').start,10.5);
assert.deepEqual(project.clips.find(c=>c.id==='caption').wordTimings.map(w=>[w.start,w.end]),[[3.6,4.2],[4.5,5.3]]);
assert.deepEqual(project.markers.map(m=>m.time),[1,3.5,7.5]);
assert.deepEqual(project.workRange,{start:1,end:9.5},'a work range spanning the insertion must expand with the timeline');
assert.equal(project.duration,13.5);

const gapProject={duration:10,markers:[{time:4}],workRange:{start:3,end:8},clips:[
  {id:'cap',track:3,start:4,duration:2,wordTimings:[{word:'hola',start:4.2,end:5.4}]},
  {id:'visual',track:0,start:4,duration:2}
]};
const gap=ops.insertGap(gapProject,3,4,1);
assert.equal(gap.ok,true);
assert.equal(gapProject.clips.find(c=>c.id==='cap').start,5);
assert.deepEqual(gapProject.clips.find(c=>c.id==='cap').wordTimings.map(w=>[w.start,w.end]),[[5.2,6.4]],'single-track gap must keep caption words aligned');
assert.equal(gapProject.clips.find(c=>c.id==='visual').start,4,'single-track gap must not move other tracks');
assert.equal(gapProject.markers[0].time,4,'single-track gap must not move global markers');
assert.deepEqual(gapProject.workRange,{start:3,end:8},'single-track gap must not change the global work range');

const invalidProject={duration:10,markers:[{time:4}],workRange:{start:2,end:8},clips:[{id:'x',track:0,start:4,duration:2}]};
const invalidSnapshot=structuredClone(invalidProject);
const invalidAt=ops.insertTime(invalidProject,{valueOf(){return 4}},1);
assert.equal(invalidAt.ok,false);assert.equal(invalidAt.reason,'invalid');
assert.deepEqual(invalidProject,invalidSnapshot,'invalid coercible insertion points must not mutate the project');
const invalidGap=ops.insertTime(invalidProject,4,[1]);
assert.equal(invalidGap.ok,false);assert.equal(invalidGap.reason,'invalid');
assert.deepEqual(invalidProject,invalidSnapshot,'invalid coercible gap values must not mutate the project');

const crossing={duration:10,markers:[{time:5}],clips:[{id:'cross',track:0,start:3,duration:4},{id:'later',track:0,start:8,duration:1}]};
const crossingSnapshot=structuredClone(crossing);
const blocked=ops.insertTime(crossing,5,1);
assert.equal(blocked.ok,false);assert.equal(blocked.reason,'crossing');
assert.deepEqual(crossing,crossingSnapshot,'crossing-clip rejection must remain atomic');

console.log('timeline time synchronization ok');
