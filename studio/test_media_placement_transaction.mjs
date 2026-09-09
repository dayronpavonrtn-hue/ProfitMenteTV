import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const Engine=require('./media-placement-engine.js');

function clone(value){return structuredClone(value)}

{
  const project={duration:30,clips:[{id:'a',track:0,start:1,duration:2,effects:{opacity:.8}}]};
  const before=clone(project);
  const result=Engine.transaction(project,()=>{
    project.duration=35;
    project.clips[0].start=4;
    project.clips[0].effects.opacity=.2;
    project.clips.push({id:'new',track:0,start:6,duration:2});
    return {ok:false,reason:'simulated-add-failure'};
  });
  assert.equal(result.ok,false);
  assert.equal(result.reason,'simulated-add-failure');
  assert.deepEqual(project,before,'a cancelled placement must restore clips, nested clip data and duration');
}

{
  const project={duration:20,clips:[{id:'a',track:0,start:2,duration:2},{id:'b',track:0,start:8,duration:2}]};
  const before=clone(project);
  const ops={split(){throw new Error('split should not be needed')},trimLeft(){return true},trimRight(){return true}};
  const result=Engine.transaction(project,()=>{
    const prepared=Engine.overwriteRange(project,0,2,2,ops);
    assert.equal(prepared.ok,true);
    project.clips.push({id:'partial',track:0,start:2,duration:2});
    throw new Error('addClip failed after destructive overwrite');
  });
  assert.equal(result.ok,false);
  assert.equal(result.reason,'operation-failed');
  assert.match(result.error.message,/addClip failed/);
  assert.deepEqual(project,before,'an exception after overwrite must restore removed clips and discard partial insertion');
}

{
  const project={duration:20,clips:[{id:'a',track:0,start:4,duration:2},{id:'b',track:0,start:10,duration:2}]};
  const before=clone(project);
  const ops={split(){throw new Error('split should not be needed')}};
  const result=Engine.transaction(project,()=>{
    const prepared=Engine.insertSpace(project,0,4,2,ops);
    assert.equal(prepared.ok,true);
    project.clips.push({id:'partial',track:0,start:4,duration:2});
    throw new Error('addClip failed after insert shift');
  });
  assert.equal(result.ok,false);
  assert.deepEqual(project,before,'an exception after insert-space must undo every shifted clip');
}

{
  const project={duration:10,clips:[{id:'a',track:0,start:0,duration:2}]};
  const result=Engine.transaction(project,()=>{
    project.duration=12;
    project.clips.push({id:'b',track:0,start:2,duration:2});
    return {ok:true,id:'b'};
  });
  assert.equal(result.ok,true);
  assert.equal(project.duration,12);
  assert.equal(project.clips.length,2,'a successful placement must remain committed');
}

{
  assert.deepEqual(Engine.transaction(null,()=>true),{ok:false,reason:'invalid-transaction'});
  assert.deepEqual(Engine.transaction({clips:[]},null),{ok:false,reason:'invalid-transaction'});
}

console.log('media placement transaction regression: ok');
