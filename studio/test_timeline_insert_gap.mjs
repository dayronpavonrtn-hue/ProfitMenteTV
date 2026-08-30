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
    {id:'c',track:0,start:7,duration:2},
    {id:'audio',track:4,start:4,duration:2}
  ],trackState:{}};
  const r=ops.insertGap(project,0,4,1);
  assert.equal(r.ok,true);
  assert.equal(r.moved,2);
  assert.equal(project.clips.find(c=>c.id==='a').start,0);
  assert.equal(project.clips.find(c=>c.id==='b').start,5);
  assert.equal(project.clips.find(c=>c.id==='c').start,8);
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

console.log('timeline insert gap tests passed');
