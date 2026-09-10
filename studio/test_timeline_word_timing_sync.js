const assert=require('assert');
require('./timeline-operations.js');
require('./timeline-word-timing-sync.js');
const {ProfitMenteRippleGapEngine:RippleGap}=require('./ripple-gap-engine.js');

const Ops=globalThis.ProfitMenteTimelineOperations;
assert(Ops,'ProfitMenteTimelineOperations must be available');
const ops=new Ops();

function word(start,end,word='x'){return {start,end,duration:end-start,word}}
function clip(id,track,start,duration,words=[],extra={}){
  return {id,track,start,duration,wordTimings:words,...extra};
}

{
  const project={duration:12,clips:[
    clip('a',0,0,2,[word(.2,.8)]),
    clip('b',0,2,2,[word(2.2,2.8)]),
    clip('c',0,5,2,[word(5.1,5.9)]),
    clip('other',1,5,2,[word(5.2,5.8)])
  ]};
  const removed=ops.rippleDelete(project,'b');
  assert(removed,'rippleDelete should succeed');
  const moved=project.clips.find(c=>c.id==='c');
  assert.strictEqual(moved.start,3);
  assert.strictEqual(moved.wordTimings[0].start,3.1);
  assert.strictEqual(moved.wordTimings[0].end,3.9);
  assert(Math.abs(moved.wordTimings[0].duration-.8)<1e-9);
  const other=project.clips.find(c=>c.id==='other');
  assert.strictEqual(other.start,5,'another track must not move');
  assert.strictEqual(other.wordTimings[0].start,5.2,'another track word timings must stay unchanged');
}

{
  const project={duration:10,clips:[
    clip('a',2,0,1,[word(.1,.6)]),
    clip('b',2,3,1,[word(3.1,3.6)]),
    clip('c',2,5,2,[word(5.2,6.4)])
  ]};
  const moved=ops.closeGaps(project,2);
  assert.strictEqual(moved,2);
  const b=project.clips.find(c=>c.id==='b');
  const c=project.clips.find(c=>c.id==='c');
  assert.strictEqual(b.start,1);
  assert.strictEqual(b.wordTimings[0].start,1.1);
  assert.strictEqual(c.start,2);
  assert.strictEqual(c.wordTimings[0].start,2.2);
  assert.strictEqual(c.wordTimings[0].end,3.4);
}

{
  const project={duration:8,trackState:{3:{locked:true}},clips:[
    clip('a',3,0,1,[word(.1,.5)]),
    clip('b',3,3,1,[word(3.1,3.5)])
  ]};
  const before=JSON.stringify(project);
  assert.strictEqual(ops.closeGaps(project,3),0,'locked track must reject closeGaps');
  assert.strictEqual(JSON.stringify(project),before,'failed edit must be atomic');
}

{
  const project={duration:8,clips:[
    clip('a',0,0,1,[word(.1,.5)]),
    clip('b',0,2,1,[word(2.1,2.5)],{locked:true}),
    clip('c',0,4,1,[word(4.1,4.5)])
  ]};
  const before=JSON.stringify(project);
  assert.strictEqual(ops.rippleDelete(project,'a'),null,'locked affected clip must reject rippleDelete');
  assert.strictEqual(JSON.stringify(project),before,'failed ripple delete must not alter word timings');
}

{
  const project={duration:9,markers:[{time:5.5}],workRange:{start:5,end:8},clips:[
    clip('a',0,0,2,[word(.2,.7)]),
    clip('b',1,0,3,[word(.4,1.1)]),
    clip('c',0,5,2,[word(5.2,6.1)]),
    clip('d',1,6,1,[word(6.1,6.7)])
  ]};
  const result=RippleGap.apply(project,4);
  assert(result.ok,'global ripple gap should close the empty 3-5s interval');
  assert.strictEqual(result.gap.start,3);
  assert.strictEqual(result.gap.end,5);
  assert.strictEqual(result.wordsShifted,2);
  const c=project.clips.find(x=>x.id==='c'),d=project.clips.find(x=>x.id==='d');
  assert.strictEqual(c.start,3);
  assert.strictEqual(c.wordTimings[0].start,3.2);
  assert.strictEqual(c.wordTimings[0].end,4.1);
  assert.strictEqual(d.start,4);
  assert.strictEqual(d.wordTimings[0].start,4.1);
  assert.strictEqual(project.markers[0].time,3.5);
  assert.strictEqual(project.workRange.start,3);
  assert.strictEqual(project.workRange.end,6);
}

console.log('timeline word timing sync regression: ok');
