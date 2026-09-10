import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {ProfitMenteClipboardEngine}=require('./clipboard-engine.js');

const makeProject=()=>({duration:20,trackState:{0:{locked:false},1:{locked:false}},clips:[
  {id:'a',track:0,start:2,duration:3,name:'A',asset:'media-a',meta:{nested:true}},
  {id:'b',track:1,start:6,duration:2,name:'B',asset:'media-b'},
  {id:'c',track:0,start:10,duration:1,name:'C'}
]});

{
  const project=makeProject(),engine=new ProfitMenteClipboardEngine(),selected=[project.clips[0],project.clips[1]];
  const result=engine.cut(project,selected);
  assert.equal(result.ok,true);assert.equal(result.removed,2);assert.equal(engine.count,2);assert.deepEqual(project.clips.map(c=>c.id),['c']);
  selected[0].meta.nested=false;
  const pasted=engine.paste(project,4);
  assert.equal(pasted.ok,true);assert.equal(pasted.clips.length,2);assert.deepEqual(pasted.clips.map(c=>c.start),[4,8]);
  assert.equal(pasted.clips[0].meta.nested,true,'cut buffer must remain an isolated snapshot');
}

{
  const project=makeProject(),engine=new ProfitMenteClipboardEngine();project.clips[0].locked=true;
  engine.copy([project.clips[2]]);const beforeBuffer=structuredClone(engine.buffer),before=structuredClone(project);
  const result=engine.cut(project,[project.clips[0]]);
  assert.equal(result.ok,false);assert.equal(result.reason,'locked-selection');assert.deepEqual(project,before);assert.deepEqual(engine.buffer,beforeBuffer,'failed cut must preserve previous clipboard');
}

{
  const project=makeProject(),engine=new ProfitMenteClipboardEngine();project.trackState[1].locked=true;
  const before=structuredClone(project),result=engine.cut(project,[project.clips[1]]);
  assert.equal(result.ok,false);assert.equal(result.reason,'locked-selection');assert.deepEqual(project,before);
}

{
  const project=makeProject(),engine=new ProfitMenteClipboardEngine(),stale=structuredClone(project.clips[0]);
  engine.copy([project.clips[2]]);const beforeBuffer=structuredClone(engine.buffer),before=structuredClone(project);
  const result=engine.cut(project,[stale]);
  assert.equal(result.ok,false);assert.equal(result.reason,'stale-selection');assert.deepEqual(project,before);assert.deepEqual(engine.buffer,beforeBuffer);
}

{
  const project=makeProject(),engine=new ProfitMenteClipboardEngine(),result=engine.cut(project,[]);
  assert.equal(result.ok,false);assert.equal(result.reason,'empty-selection');assert.equal(project.clips.length,3);assert.equal(engine.count,0);
}

console.log('Clipboard cut regression OK');
