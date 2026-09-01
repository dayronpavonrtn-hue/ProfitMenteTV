import assert from 'node:assert/strict';
import './timeline-operations.js';

const Ops=globalThis.ProfitMenteTimelineOperations;
assert.ok(Ops,'Timeline operations engine was not exported');
const clone=value=>structuredClone(value);

{
  const ops=new Ops();
  const project={duration:20,trackState:{0:{locked:false}},clips:[{id:'a',track:0,start:0,duration:4,asset:'a.mp4',locked:true}]};
  const before=clone(project);
  assert.equal(ops.split(project,'a',2),null,'split must reject an individually locked clip');
  assert.equal(ops.trimLeft(project,'a',1),null,'trimLeft must reject an individually locked clip');
  assert.equal(ops.trimRight(project,'a',3),null,'trimRight must reject an individually locked clip');
  assert.deepEqual(project,before,'locked clip operations must be atomic');
}

{
  const ops=new Ops();
  const project={duration:20,trackState:{'0':{locked:true}},clips:[{id:'a',track:0,start:0,duration:4,asset:'a.mp4'}]};
  const before=clone(project);
  assert.equal(ops.split(project,'a',2),null,'string-keyed track lock must block split');
  assert.deepEqual(project,before,'track lock must preserve the project');
}

{
  const ops=new Ops();
  const project={duration:20,trackStates:{'1':{locked:true}},clips:[{id:'a',track:1,start:0,duration:4}]};
  const before=clone(project);
  assert.equal(ops.trimRight(project,'a',2),null,'alternate trackStates must be respected');
  assert.deepEqual(project,before);
}

{
  const ops=new Ops();
  const project={duration:20,clips:[
    {id:'a',track:0,start:0,duration:2},
    {id:'b',track:0,start:4,duration:2,locked:true},
    {id:'audio',track:5,start:3,duration:5}
  ]};
  const before=clone(project);
  assert.equal(ops.rippleDelete(project,'a'),null,'ripple delete must stop when a downstream clip would be moved');
  assert.deepEqual(project,before,'blocked ripple delete must not partially mutate the project');
}

{
  const ops=new Ops();
  const project={duration:20,clips:[
    {id:'a',track:0,start:0,duration:2},
    {id:'b',track:0,start:6,duration:2,locked:true}
  ]};
  const before=clone(project);
  assert.equal(ops.closeGaps(project,0),0,'closeGaps must not move a protected clip');
  assert.deepEqual(project,before,'blocked gap closure must be atomic');
}

{
  const ops=new Ops();
  const project={duration:20,clips:[{id:'a',track:0,start:6,duration:2,locked:true}]};
  const before=clone(project);
  const result=ops.insertGap(project,0,5,1);
  assert.equal(result.ok,false);assert.equal(result.reason,'locked');
  assert.deepEqual(project,before,'insertGap must preserve individually locked clips');
}

{
  const ops=new Ops();
  const project={duration:20,clips:[
    {id:'a',track:0,start:6,duration:2},
    {id:'b',track:1,start:7,duration:2,locked:true}
  ]};
  const before=clone(project);
  const result=ops.insertTime(project,5,1);
  assert.equal(result.ok,false);assert.equal(result.reason,'locked');assert.equal(result.clip.id,'b');
  assert.deepEqual(project,before,'global insert time must be atomic when any affected clip is protected');
}

{
  const ops=new Ops();
  ops.copy({id:'source',track:0,start:0,duration:2,name:'Source'});
  const project={duration:20,trackState:{'2':{locked:true}},clips:[]};
  const before=clone(project);
  assert.equal(ops.paste(project,3,2),null,'paste must reject a locked destination track at engine level');
  assert.deepEqual(project,before);
}

{
  const ops=new Ops();
  const project={duration:20,clips:[
    {id:'a',track:0,start:0,duration:2},
    {id:'b',track:0,start:5,duration:2}
  ]};
  assert.ok(ops.split(project,'a',1),'unlocked split must still work');
  assert.ok(ops.rippleDelete(project,'b'),'unlocked ripple delete must still work');
}

console.log('timeline lock safety ok');