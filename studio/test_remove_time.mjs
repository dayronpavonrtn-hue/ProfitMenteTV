import assert from 'node:assert/strict';
await import('./remove-time-engine.js');
const Engine=globalThis.ProfitMenteRemoveTimeEngine;
assert.ok(Engine,'remove time engine must be exposed');
const engine=new Engine();

{
  const project={duration:12,clips:[
    {id:'video',track:0,start:6,duration:2},
    {id:'overlay',track:1,start:6.5,duration:1},
    {id:'caption',track:3,start:7,duration:1},
    {id:'music',track:5,start:8,duration:3},
    {id:'before',track:0,start:1,duration:2}
  ],trackState:{}};
  const r=engine.remove(project,5,1);
  assert.equal(r.ok,true);
  assert.equal(r.moved,4);
  assert.equal(project.clips.find(c=>c.id==='video').start,5);
  assert.equal(project.clips.find(c=>c.id==='overlay').start,5.5);
  assert.equal(project.clips.find(c=>c.id==='caption').start,6);
  assert.equal(project.clips.find(c=>c.id==='music').start,7);
  assert.equal(project.clips.find(c=>c.id==='before').start,1);
  assert.equal(project.duration,11);
}

{
  const project={duration:10,clips:[{id:'cross',track:3,start:4.5,duration:1},{id:'later',track:0,start:7,duration:1}],trackState:{}};
  const before=structuredClone(project);
  const r=engine.remove(project,5,1);
  assert.equal(r.ok,false);
  assert.equal(r.reason,'occupied');
  assert.deepEqual(project,before,'occupied removal range must be atomic');
}

{
  const project={duration:10,clips:[{id:'locked',track:5,start:7,duration:1}],trackState:{5:{locked:true}}};
  const before=structuredClone(project);
  const r=engine.remove(project,5,1);
  assert.equal(r.ok,false);
  assert.equal(r.reason,'locked');
  assert.deepEqual(project,before,'locked downstream track must block synchronized removal');
}

{
  const project={duration:10,clips:[{id:'legacy-locked',track:5,start:7,duration:1}],trackState:{5:{locked:false}},trackStates:{5:{locked:true}}};
  const before=structuredClone(project);
  const r=engine.remove(project,5,1);
  assert.equal(r.ok,false);
  assert.equal(r.reason,'locked');
  assert.deepEqual(project,before,'legacy lock must prevail over modern unlocked state');
}

{
  const project={duration:10,clips:[{id:'alias-locked',track:1,start:7,duration:1}],trackStates:{'01':{locked:true}}};
  const before=structuredClone(project);
  const r=engine.remove(project,5,1);
  assert.equal(r.ok,false);
  assert.equal(r.reason,'locked');
  assert.deepEqual(project,before,'legacy canonical track aliases must block remove-time edits');
}

{
  const project={duration:10,clips:[{id:'clip-locked',track:1,start:7,duration:1,locked:true}],trackState:{}};
  const before=structuredClone(project);
  const r=engine.remove(project,5,1);
  assert.equal(r.ok,false);
  assert.equal(r.reason,'locked');
  assert.deepEqual(project,before,'clip-level locks must block remove-time edits atomically');
}

{
  const project={duration:10,clips:[{id:'modern-locked',track:'5',start:7,duration:1}],trackState:{5:{locked:true}},trackStates:{5:{locked:false}}};
  const before=structuredClone(project);
  const r=engine.remove(project,5,1);
  assert.equal(r.ok,false);
  assert.equal(r.reason,'locked');
  assert.deepEqual(project,before,'modern lock must not be cancelled by legacy unlocked state');
}

assert.equal(engine.trackLocked({},5),false);
assert.equal(engine.trackLocked({trackStates:{'5':{locked:true}}},5),true,'serialized legacy track keys must be supported');
assert.equal(engine.trackLocked({trackStates:{'1.0':{locked:true}}},'01'),true,'equivalent legacy aliases must resolve to the same canonical track');
assert.equal(engine.trackLocked({trackState:{'1.5':{locked:true}}},1.5),false,'fractional tracks must not canonicalize into editor tracks');
assert.equal(engine.trackLocked({trackState:{7:{locked:true}}},7),false,'out-of-range tracks must not canonicalize into editor tracks');
assert.equal(engine.trackLocked({trackState:{5:{locked:true}}},'invalid'),false,'invalid track identifiers must not lock by accident');

{
  const project={
    duration:12,
    clips:[
      {id:'caption',track:3,start:7,duration:2,wordTimings:[
        {word:'uno',start:7,end:7.4,duration:.4},
        {word:'dos',start:7.5,end:8,duration:.5}
      ]},
      {id:'video',track:0,start:9,duration:1}
    ],
    markers:[{id:'before',time:2},{id:'inside',time:5.5},{id:'edge',time:6},{id:'after',time:9}],
    workRange:{start:4,end:10},
    trackState:{}
  };
  const r=engine.remove(project,5,1);
  assert.equal(r.ok,true);
  assert.equal(project.clips[0].start,6);
  assert.deepEqual(project.clips[0].wordTimings.map(w=>[w.start,w.end,w.duration]),[[6,6.4,.4],[6.5,7,.5]],'caption word timings must move with their clip');
  assert.deepEqual(project.markers.map(m=>[m.id,m.time]),[['before',2],['edge',5],['after',8]],'markers inside removed time must drop and later markers must ripple');
  assert.deepEqual(project.workRange,{start:4,end:9},'work range must stay synchronized with removed time');
  assert.equal(project.duration,11);
}

{
  const project={duration:10,clips:[{id:'early',track:0,start:1,duration:2}],trackState:{}};
  const r=engine.remove(project,8,1);
  assert.equal(r.ok,true);
  assert.equal(r.moved,0);
  assert.equal(project.duration,9,'blank tail time should be removable');
}

{
  const project={duration:5,clips:[],trackState:{}};
  const before=structuredClone(project);
  const r=engine.remove(project,4.5,1);
  assert.equal(r.ok,false);
  assert.equal(r.reason,'out_of_range');
  assert.deepEqual(project,before);
}

console.log('remove time tests passed');
