import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('./timeline-magnet.js',import.meta.url),'utf8');

globalThis.window=globalThis;
globalThis.document={
  querySelector:()=>null,
  querySelectorAll:()=>[],
  addEventListener:()=>{},
  elementFromPoint:()=>null,
  createElement:()=>({dataset:{}}),
  head:{appendChild:()=>{}}
};
globalThis.ProfitMenteGroupDragEngine=function ProfitMenteGroupDragEngine(){};
globalThis.assets=[];
globalThis.names=['Video','Overlay','Motion','Captions','SFX','Music','Voice'];
globalThis.project={duration:10,clips:[]};
vm.runInThisContext(source,{filename:'timeline-magnet.js'});

const magnet=globalThis.ProfitMenteTimelineMagnet;
assert.ok(magnet,'timeline magnet API must load');
assert.equal(typeof magnet.applySingleMove,'function');
assert.equal(typeof magnet.trackLocked,'function');
assert.equal(typeof magnet.restoreMoveSnapshot,'function');

{
  globalThis.project={duration:10,trackState:{0:{locked:false}},trackStates:{0:{locked:true}},clips:[]};
  assert.equal(magnet.trackLocked(0),true,'legacy lock must win over a modern unlocked state');
  assert.equal(magnet.trackLocked(1),false);
}

{
  const clip={id:'locked',track:0,start:2,duration:2};
  globalThis.project={duration:10,trackState:{0:{locked:false}},trackStates:{0:{locked:true}},clips:[clip]};
  const before=structuredClone(globalThis.project);
  const result=magnet.applySingleMove(clip,8,0);
  assert.equal(result.blocked,true,'single drag must reject a mixed-state locked source track');
  assert.deepEqual(globalThis.project,before,'blocked drag must not partially mutate the project');
}

{
  const clip={id:'grow',track:0,start:7,duration:2};
  globalThis.project={duration:10,clips:[clip]};
  const result=magnet.applySingleMove(clip,12,0);
  assert.equal(result.blocked,false);
  assert.equal(clip.start,12,'single drag must preserve the requested position beyond the old end');
  assert.equal(globalThis.project.duration,14,'single drag must extend the sequence to the moved clip end');
}

{
  const clip={id:'destination-lock',track:0,start:1,duration:2};
  globalThis.project={duration:10,trackState:{1:{locked:false}},trackStates:{1:{locked:true}},clips:[clip]};
  const result=magnet.applySingleMove(clip,11,1);
  assert.equal(result.blocked,false,'a locked destination should not block safe horizontal movement');
  assert.equal(clip.track,0,'legacy destination lock must prevent vertical track reassignment');
  assert.equal(clip.start,11);
  assert.equal(globalThis.project.duration,13);
}

{
  const clip={id:'no-shrink',track:0,start:1,duration:2};
  globalThis.project={duration:20,clips:[clip]};
  magnet.applySingleMove(clip,3,0);
  assert.equal(globalThis.project.duration,20,'moving inside the sequence must never shrink duration');
}

{
  const clip={id:'clip-lock',track:0,start:1,duration:2,locked:true};
  globalThis.project={duration:10,clips:[clip]};
  const result=magnet.applySingleMove(clip,5,0);
  assert.equal(result.blocked,true,'clip-level locks must block drag even on an unlocked track');
  assert.equal(clip.start,1);
}

{
  const a={id:'a',track:2,start:15,duration:2};
  const b={id:'b',track:1,start:18,duration:1};
  const untouched={id:'other',track:0,start:4,duration:3};
  globalThis.project={duration:24,clips:[a,b,untouched]};
  const restored=magnet.restoreMoveSnapshot([
    {id:'a',track:0,start:2,duration:2},
    {id:'b',track:1,start:5,duration:1}
  ],10);
  assert.equal(restored,2,'cancel rollback must report every moved member that was restored');
  assert.deepEqual({start:a.start,track:a.track},{start:2,track:0});
  assert.deepEqual({start:b.start,track:b.track},{start:5,track:1});
  assert.deepEqual({start:untouched.start,track:untouched.track},{start:4,track:0},'cancel rollback must not touch unrelated clips');
  assert.equal(globalThis.project.duration,10,'cancel rollback must restore the pre-drag sequence duration after temporary growth');
}

{
  globalThis.assets=[{id:7,type:'audio'}];
  const legacyAudio={id:9,asset:'7',track:0,start:0,duration:1};
  assert.equal(magnet.compatible(legacyAudio,4),true,'numeric media IDs must resolve when a legacy clip stores the same ID as a string');
  assert.equal(magnet.compatible(legacyAudio,0),false,'legacy audio identity must not be misclassified as visual media');
  globalThis.assets=[];
}

assert.match(source,/active\.timelineDuration/,'drag math must retain the timeline duration captured at pointer-down');
assert.match(source,/\*active\.timelineDuration/,'pointer delta must use the captured duration instead of a duration mutated during drag');
assert.match(source,/e\?\.type==='pointercancel'/,'pointer cancellation must take an explicit rollback path');
assert.match(source,/restoreMoveSnapshot\(originals,originalProjectDuration\)/,'cancel path must restore both clip positions and original duration');
assert.match(source,/find\(c=>sameId\(c\.id,el\.dataset\.id\)\)/,'pointer-down must resolve numeric legacy clip IDs against string DOM dataset IDs');

console.log('timeline drag safety regression: ok');
