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
