import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const src=fs.readFileSync(new URL('./timeline-operations.js',import.meta.url),'utf8');
const context={globalThis:{},structuredClone,crypto:{randomUUID:()=>`id-${Math.random()}`}};
context.globalThis=context;
vm.runInNewContext(src,context);
const Ops=context.ProfitMenteTimelineOperations;
assert.equal(typeof Ops,'function');
const ops=new Ops();

{
  const project={duration:10,clips:[
    {id:'a',track:0,start:0,duration:2},
    {id:'b',track:0,start:4,duration:2},
    {id:'c',track:0,start:8,duration:2},
    {id:'audio',track:4,start:4,duration:2}
  ],trackState:{}};
  const r=ops.insertGap(project,0,4,1);
  assert.equal(r.ok,true);
  assert.equal(r.moved,2);
  assert.equal(project.clips.find(c=>c.id==='a').start,0);
  assert.equal(project.clips.find(c=>c.id==='b').start,5);
  assert.equal(project.clips.find(c=>c.id==='c').start,9);
  assert.equal(project.clips.find(c=>c.id==='audio').start,4,'other tracks must not move');
  assert.equal(project.duration,11,'project duration must extend when shifted clips exceed the old boundary');
}

{
  const project={duration:10,clips:[{id:'a',track:0,start:3,duration:4},{id:'b',track:0,start:8,duration:1}],trackState:{}};
  const before=structuredClone(project);
  const r=ops.insertGap(project,0,5,1);
  assert.equal(r.ok,false);
  assert.equal(r.reason,'crossing');
  assert.deepEqual(project,before,'operation must be atomic when a clip crosses the cursor');
}

{
  const project={duration:10,clips:[{id:'a',track:0,start:6,duration:2}],trackState:{0:{locked:true}}};
  const before=structuredClone(project);
  const r=ops.insertGap(project,0,5,1);
  assert.equal(r.ok,false);
  assert.equal(r.reason,'locked');
  assert.deepEqual(project,before,'locked tracks must remain untouched');
}

{
  const project={duration:10,clips:[{id:'a',track:0,start:1,duration:1}],trackState:{}};
  const before=structuredClone(project);
  const r=ops.insertGap(project,0,5,1);
  assert.equal(r.ok,false);
  assert.equal(r.reason,'empty');
  assert.deepEqual(project,before,'empty downstream range must not change the project');
}

{
  const project={duration:12,clips:[
    {id:'video',track:0,start:5,duration:2},
    {id:'overlay',track:1,start:5.5,duration:1},
    {id:'caption',track:3,start:6,duration:1},
    {id:'music',track:5,start:7,duration:3},
    {id:'voice',track:6,start:8,duration:2},
    {id:'before',track:0,start:1,duration:2}
  ],trackState:{}};
  const r=ops.insertTime(project,5,1);
  assert.equal(r.ok,true);
  assert.equal(r.moved,5);
  assert.deepEqual([...r.tracks].sort((a,b)=>a-b),[0,1,3,5,6]);
  assert.equal(project.clips.find(c=>c.id==='video').start,6);
  assert.equal(project.clips.find(c=>c.id==='overlay').start,6.5);
  assert.equal(project.clips.find(c=>c.id==='caption').start,7);
  assert.equal(project.clips.find(c=>c.id==='music').start,8);
  assert.equal(project.clips.find(c=>c.id==='voice').start,9);
  assert.equal(project.clips.find(c=>c.id==='before').start,1,'clips before the cursor must not move');
  assert.equal(project.duration,13,'global insert must extend project duration by the inserted time');
}

{
  const project={duration:10,clips:[
    {id:'video',track:0,start:6,duration:2},
    {id:'music',track:5,start:7,duration:2}
  ],trackState:{5:{locked:true}}};
  const before=structuredClone(project);
  const r=ops.insertTime(project,5,1);
  assert.equal(r.ok,false);
  assert.equal(r.reason,'locked');
  assert.equal(r.track,5);
  assert.deepEqual(project,before,'global insert must be atomic when an affected track is locked');
}

{
  const project={duration:10,clips:[
    {id:'crossing-caption',track:3,start:4,duration:3},
    {id:'later-video',track:0,start:8,duration:1}
  ],trackState:{}};
  const before=structuredClone(project);
  const r=ops.insertTime(project,5,1);
  assert.equal(r.ok,false);
  assert.equal(r.reason,'crossing');
  assert.equal(r.track,3);
  assert.deepEqual(project,before,'global insert must not desynchronize a clip that crosses the cursor');
}

console.log('timeline insert gap tests passed');
