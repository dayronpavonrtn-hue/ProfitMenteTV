const assert=require('assert');
global.crypto={randomUUID:()=>`id-${Math.random()}`};
require('../timeline-operations.js');
require('../remove-time-integration.js');
const Ops=global.ProfitMenteTimelineOperations;
assert(Ops,'timeline operations must load');
const ops=new Ops();
const words=(start)=>[{word:'uno',start,end:start+.4},{word:'dos',start:start+.5,end:start+.9}];

{
  const project={duration:10,clips:[
    {id:'lead',track:3,start:0,duration:2,wordTimings:words(0)},
    {id:'target',track:3,start:2,duration:2,wordTimings:words(2)},
    {id:'tail',track:3,start:4,duration:2,wordTimings:words(4)}
  ]};
  const result=ops.rippleDelete(project,'target');
  assert(result,'ripple delete should succeed');
  const tail=project.clips.find(c=>c.id==='tail');
  assert.equal(tail.start,2,'downstream caption should move with ripple delete');
  assert.equal(tail.wordTimings[0].start,2,'word timing start should move with caption');
  assert.equal(tail.wordTimings[1].end,2.9,'word timing end should move with caption');
}

{
  const project={duration:12,clips:[
    {id:'a',track:3,start:0,duration:2,wordTimings:words(0)},
    {id:'b',track:3,start:5,duration:2,wordTimings:words(5)},
    {id:'c',track:3,start:9,duration:1,wordTimings:words(9)}
  ]};
  const moved=ops.closeGaps(project,3);
  assert.equal(moved,2,'close gaps should move both downstream captions');
  const b=project.clips.find(c=>c.id==='b'),c=project.clips.find(c=>c.id==='c');
  assert.equal(b.start,2);assert.equal(b.wordTimings[0].start,2);assert.equal(b.wordTimings[1].end,2.9);
  assert.equal(c.start,4);assert.equal(c.wordTimings[0].start,4);assert.equal(c.wordTimings[1].end,4.9);
}

{
  const project={duration:8,trackState:{3:{locked:true}},clips:[
    {id:'a',track:3,start:0,duration:2,wordTimings:words(0)},
    {id:'b',track:3,start:4,duration:2,wordTimings:words(4)}
  ]};
  const before=JSON.stringify(project);assert.equal(ops.closeGaps(project,3),0);assert.equal(JSON.stringify(project),before,'locked tracks must remain untouched');
}

{
  const project={duration:8,clips:[
    {id:'target',track:0,start:0,duration:2},
    {id:'bad',track:0,start:2,duration:2,wordTimings:[{word:'x',start:{valueOf:()=>2},end:'2.5'}]}
  ]};
  ops.rippleDelete(project,'target');
  const bad=project.clips.find(c=>c.id==='bad');
  assert.equal(typeof bad.wordTimings[0].start,'object','coercible object timing must not be rewritten');
  assert.equal(bad.wordTimings[0].end,.5,'legacy numeric-string end may shift safely');
}

console.log('Timeline ripple word sync regression: OK');
