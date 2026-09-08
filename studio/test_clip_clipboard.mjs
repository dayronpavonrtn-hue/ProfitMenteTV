import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {ProfitMenteClipClipboardEngine}=require('./clip-clipboard-engine.js');

const base=()=>({
  duration:6,
  clips:[
    {id:1,groupId:'g1',track:0,start:1,duration:2,sourceOffset:.25,brightness:1.1,wordTimings:[{word:'uno',start:.2,end:.5}]},
    {id:2,groupId:'g1',track:1,start:2.5,duration:1,sourceOffset:.5,locked:true,wordTimings:[{word:'dos',start:.1,end:.4}]},
    {id:'solo',track:0,start:4,duration:1,sourceOffset:0}
  ],
  trackState:{0:{locked:false},1:{locked:false},2:{locked:false},3:{locked:false}}
});

{
  const project=base(),engine=new ProfitMenteClipClipboardEngine();
  const copied=engine.collect(project,'+01.0');
  assert.equal(copied.ok,true);assert.equal(copied.count,2);assert.equal(copied.origin,1);assert.equal(copied.anchorTrack,0);
  project.clips[0].wordTimings[0].word='mutado';
  const pasted=engine.paste(project,9,{extendDuration:true});
  assert.equal(pasted.ok,true);assert.equal(pasted.count,2);assert.equal(project.clips.length,5);
  assert.equal(pasted.clips[0].start,9);assert.equal(pasted.clips[1].start,10.5);
  assert.equal(pasted.clips[0].sourceOffset,.25);assert.equal(pasted.clips[0].brightness,1.1);
  assert.equal(pasted.clips[0].wordTimings[0].word,'uno');
  assert.notEqual(String(pasted.clips[0].id),'1');assert.notEqual(String(pasted.clips[1].id),'2');
  assert.notEqual(pasted.clips[0].groupId,'g1');assert.equal(pasted.clips[0].groupId,pasted.clips[1].groupId);
  assert.equal(pasted.clips[1].locked,true,'a locked source may be copied without mutating it');
  assert.equal(project.duration,11.5);
}

{
  const project=base(),engine=new ProfitMenteClipClipboardEngine();assert.equal(engine.collect(project,1).ok,true);
  const pasted=engine.paste(project,2,{targetTrack:2});
  assert.equal(pasted.ok,true);assert.equal(pasted.trackDelta,2);assert.deepEqual(pasted.clips.map(c=>c.track),[2,3]);
  assert.deepEqual(pasted.clips.map(c=>c.start),[2,3.5]);
}

{
  const project=base(),engine=new ProfitMenteClipClipboardEngine();assert.equal(engine.collect(project,1).ok,true);
  project.trackState[3].locked=true;
  const before=structuredClone(project),result=engine.paste(project,2,{targetTrack:2});
  assert.equal(result.ok,false);assert.equal(result.reason,'locked');assert.equal(result.track,3);assert.deepEqual(project,before,'group paste must be atomic when any destination track is locked');
}

{
  const project=base(),engine=new ProfitMenteClipClipboardEngine();assert.equal(engine.collect(project,1).ok,true);
  const before=structuredClone(project),result=engine.paste(project,2,{targetTrack:6});
  assert.equal(result.ok,false);assert.equal(result.reason,'track');assert.deepEqual(project,before,'out-of-range group remap must be atomic');
}

{
  const project=base(),engine=new ProfitMenteClipClipboardEngine();
  assert.equal(engine.collect(project,1).ok,true);project.trackState[0].locked=true;
  const before=structuredClone(project),result=engine.paste(project,5);
  assert.equal(result.ok,false);assert.equal(result.reason,'locked');assert.deepEqual(project,before,'locked-track paste must be atomic');
}

{
  const project=base(),engine=new ProfitMenteClipClipboardEngine();assert.equal(engine.collect(project,'solo').ok,true);
  for(const bad of [[3],true,{valueOf(){return 3}},new Number(3),'0x10']){
    const before=structuredClone(project),result=engine.paste(project,bad);
    assert.equal(result.ok,false);assert.equal(result.reason,'time');assert.deepEqual(project,before);
  }
}

{
  const project=base(),engine=new ProfitMenteClipClipboardEngine();assert.equal(engine.collect(project,'solo').ok,true);
  for(const bad of [[1],true,{valueOf(){return 1}},new Number(1),'0x1']){
    const before=structuredClone(project),result=engine.paste(project,1,{targetTrack:bad});
    assert.equal(result.ok,false);assert.equal(result.reason,'track');assert.deepEqual(project,before);
  }
}

{
  const project=base(),engine=new ProfitMenteClipClipboardEngine();assert.equal(engine.collect(project,'solo').ok,true);
  const before=structuredClone(project),result=engine.paste(project,6,{extendDuration:false});
  assert.equal(result.ok,false);assert.equal(result.reason,'boundary');assert.deepEqual(project,before);
}

{
  const project=base();project.clips.push({id:'01',track:0,start:5,duration:.5});
  const engine=new ProfitMenteClipClipboardEngine(),result=engine.collect(project,1);
  assert.equal(result.ok,false);assert.equal(result.reason,'ambiguous');assert.equal(engine.hasData(),false);
}

{
  const project=base(),engine=new ProfitMenteClipClipboardEngine();assert.equal(engine.collect(project,'solo').ok,true);
  project.clips.push({id:'01',track:2,start:5,duration:.5});
  const before=structuredClone(project),result=engine.paste(project,1);
  assert.equal(result.ok,false);assert.equal(result.reason,'ambiguous');assert.deepEqual(project,before);
}

{
  const project=base(),engine=new ProfitMenteClipClipboardEngine();
  const empty=engine.paste(project,1);assert.equal(empty.ok,false);assert.equal(empty.reason,'empty');
  assert.equal(engine.collect(project,'solo').ok,true);engine.clear();assert.equal(engine.hasData(),false);
}

console.log('Clip clipboard engine OK');
