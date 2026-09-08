import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const Split=require('./split-edit-engine.js');
const Razor=require('./razor-all-engine.js');
let seq=0,gseq=0;
const engine=new Razor(Split);
const opts={idFactory:()=>`new-${++seq}`,groupIdFactory:(side,old)=>side==='left'?old:`${side}-g-${++gseq}`};

{
  const p={duration:10,clips:[
    {id:'v',track:0,start:0,duration:8,sourceOffset:2,speed:2},
    {id:'o',track:1,start:1,duration:6},
    {id:'a',track:4,start:0,duration:8,locked:true}
  ]};
  const r=engine.split(p,4,opts);
  assert.equal(r.ok,true);assert.equal(r.cuts,2);assert.equal(r.blocked,1);assert.equal(p.clips.length,5);
  const vr=p.clips.find(c=>c.id===r.rightByOriginal.find(x=>x.originalId==='v').rightId);
  assert.equal(vr.start,4);assert.equal(vr.sourceOffset,10);assert.equal(p.clips.filter(c=>c.id==='a').length,1);
}

{
  const p={duration:6,clips:[{id:'cap',track:3,start:0,duration:6,name:'one two three',wordTimings:[
    {word:'one',start:0,end:1},{word:'two',start:2.5,end:3.5},{word:'three',start:5,end:6}
  ]}]};
  const r=engine.split(p,3,opts);assert.equal(r.ok,true);
  const [left,right]=p.clips;
  assert.deepEqual(left.wordTimings.map(x=>x.word),['one','two']);
  assert.deepEqual(right.wordTimings.map(x=>x.word),['two','three']);
  assert.equal(left.wordTimings[1].end,3);assert.equal(right.wordTimings[0].start,3);
  assert.equal(left.name,'one two');assert.equal(right.name,'two three');
}

{
  const p={duration:10,clips:[
    {id:'v',groupId:'av',track:0,start:0,duration:8},
    {id:'a',groupId:'av',track:4,start:0,duration:8}
  ]};
  const r=engine.split(p,4,opts);assert.equal(r.ok,true);assert.equal(r.cuts,2);
  const left=p.clips.filter(c=>c.start===0),right=p.clips.filter(c=>c.start===4);
  assert.deepEqual([...new Set(left.map(c=>c.groupId))],['av']);
  assert.equal(new Set(right.map(c=>c.groupId)).size,1);assert.notEqual(left[0].groupId,right[0].groupId);
}

{
  const before=[
    {id:'v',groupId:'av',track:0,start:0,duration:8},
    {id:'a',groupId:'av',track:4,start:5,duration:3}
  ];
  const p={duration:10,clips:structuredClone(before)};
  const r=engine.split(p,4,opts);
  assert.equal(r.ok,false);assert.equal(r.reason,'nothing-editable');assert.equal(r.misaligned,1);assert.deepEqual(p.clips,before);
}

{
  const p={duration:10,trackState:{0:{locked:true}},clips:[
    {id:'v',track:'0',start:'0',duration:'8'},
    {id:'o',track:1,start:0,duration:8}
  ]};
  const r=engine.split(p,'4',opts);assert.equal(r.ok,true);assert.equal(r.cuts,1);assert.equal(r.blocked,1);assert.equal(p.clips.filter(c=>c.id==='v').length,1);
}

{
  const p={duration:10,clips:[{id:'v',track:0,start:0,duration:8}]};
  const before=structuredClone(p.clips);assert.equal(engine.split(p,[],opts).reason,'invalid-time');assert.deepEqual(p.clips,before);
}

{
  const p={duration:10,clips:[{id:'7',track:0,start:0,duration:8},{id:7,track:1,start:0,duration:8}]};
  const before=structuredClone(p.clips);assert.equal(engine.split(p,4,opts).reason,'ambiguous-id');assert.deepEqual(p.clips,before);
}

{
  const p={duration:10,clips:[{id:'bad',track:0,start:[],duration:8}]};
  assert.equal(engine.split(p,4,opts).reason,'invalid-clip');
}

console.log('Razor All engine OK');
