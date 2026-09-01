import assert from 'node:assert/strict';
import './timeline-operations.js';
import './media-placement-engine.js';
const Ops=globalThis.ProfitMenteTimelineOperations,Placement=globalThis.ProfitMenteMediaPlacementEngine;
assert.ok(Ops&&Placement,'placement dependencies must export');
const ops=new Ops();

const insertProject={duration:20,clips:[
  {id:'a',track:0,name:'A',start:0,duration:6,asset:'a.mp4',sourceOffset:2,speed:1.5},
  {id:'b',track:0,name:'B',start:8,duration:3,asset:'b.mp4'},
  {id:'music',track:5,name:'Music',start:1,duration:10,asset:'music.mp3'}
]};
const inserted=Placement.insertSpace(insertProject,0,3,2,ops);
assert.equal(inserted.ok,true);assert.equal(inserted.split,true,'insert inside a clip must split it');
const left=insertProject.clips.find(c=>c.id==='a'),right=insertProject.clips.find(c=>c.track===0&&c.asset==='a.mp4'&&c.id!=='a');
assert.equal(left.duration,3);assert.ok(right);assert.equal(right.start,5,'right continuation must move after inserted interval');
assert.equal(right.sourceOffset,6.5,'split continuation must preserve source position before shifting');
assert.equal(insertProject.clips.find(c=>c.id==='b').start,10,'later clips on target track must shift');
assert.equal(insertProject.clips.find(c=>c.id==='music').start,1,'other tracks must remain untouched');

const locked={duration:20,trackState:{0:{locked:true}},clips:[{id:'locked',track:0,start:2,duration:5,asset:'locked.mp4'}]};
const lockedBefore=structuredClone(locked);
assert.equal(Placement.trackLocked(locked,0),true,'numeric track lock must be detected');
assert.equal(Placement.trackLocked({trackState:{'5':{locked:true}}},5),true,'string track lock must be detected');
assert.equal(Placement.trackLocked(locked,1),false,'unlocked track must remain editable');
const lockedInsert=Placement.insertSpace(locked,0,3,2,ops);assert.equal(lockedInsert.ok,false);assert.equal(lockedInsert.reason,'locked-track');assert.deepEqual(locked,lockedBefore,'locked insert must not mutate project');
const lockedOverwrite=Placement.overwriteRange(locked,0,3,2,ops);assert.equal(lockedOverwrite.ok,false);assert.equal(lockedOverwrite.reason,'locked-track');assert.deepEqual(locked,lockedBefore,'locked overwrite must not mutate project');

const lockedClipInsert={duration:20,clips:[{id:'free',track:0,start:0,duration:2,asset:'free.mp4'},{id:'protected',track:0,start:5,duration:3,asset:'protected.mp4',locked:true},{id:'tail',track:0,start:10,duration:2,asset:'tail.mp4'}]};
const lockedClipInsertBefore=structuredClone(lockedClipInsert);
const blockedByClip=Placement.insertSpace(lockedClipInsert,0,4,1,ops);assert.equal(blockedByClip.ok,false);assert.equal(blockedByClip.reason,'locked-clip');assert.deepEqual(blockedByClip.lockedIds,['protected']);assert.deepEqual(lockedClipInsert,lockedClipInsertBefore,'insert blocked by a locked clip must be atomic');
const beforeProtectedInsert=Placement.insertSpace(lockedClipInsert,0,1,1,ops);assert.equal(beforeProtectedInsert.ok,false);assert.equal(beforeProtectedInsert.reason,'locked-clip','inserting before a locked downstream clip would move it and must be blocked');assert.deepEqual(lockedClipInsert,lockedClipInsertBefore);

const lockedClipOverwrite={duration:20,clips:[{id:'protected',track:0,start:4,duration:5,asset:'protected.mp4',locked:true},{id:'safe',track:0,start:12,duration:2,asset:'safe.mp4'}]};
const lockedClipOverwriteBefore=structuredClone(lockedClipOverwrite);
const overwriteLocked=Placement.overwriteRange(lockedClipOverwrite,0,5,2,ops);assert.equal(overwriteLocked.ok,false);assert.equal(overwriteLocked.reason,'locked-clip');assert.deepEqual(overwriteLocked.lockedIds,['protected']);assert.deepEqual(lockedClipOverwrite,lockedClipOverwriteBefore,'overwrite blocked by locked clip must not trim or split anything');
const overwriteSafe=Placement.overwriteRange(lockedClipOverwrite,0,10,1,ops);assert.equal(overwriteSafe.ok,true,'overwrite outside locked clip remains allowed');assert.deepEqual(lockedClipOverwrite.clips.find(c=>c.id==='protected'),lockedClipOverwriteBefore.clips.find(c=>c.id==='protected'),'unrelated locked clip must remain untouched');

const overflow={duration:10,clips:[{id:'tail',track:0,start:7,duration:3,asset:'tail.mp4'}]};
const blocked=Placement.insertSpace(overflow,0,5,2,ops);assert.equal(blocked.ok,false);assert.equal(blocked.reason,'out-of-range');assert.equal(overflow.clips[0].start,7,'failed insert must not mutate project');

const endRange=Placement.range({duration:10},10,2);assert.equal(endRange.duration,0,'placement at exact project end must not overflow');assert.equal(endRange.end,10);assert.equal(endRange.valid,false);
const shortTail=Placement.range({duration:10},9.9,2);assert.ok(shortTail.duration<.25,'sub-minimum tail must remain bounded by project duration');assert.equal(shortTail.end,10);assert.equal(shortTail.valid,false);
const exactTail=Placement.range({duration:10},9.75,2);assert.equal(exactTail.duration,.25);assert.equal(exactTail.end,10);assert.equal(exactTail.valid,true);
const endInsert={duration:10,clips:[]};const endInsertResult=Placement.insertSpace(endInsert,0,10,2,ops);assert.equal(endInsertResult.ok,false);assert.equal(endInsertResult.reason,'out-of-range');assert.deepEqual(endInsert.clips,[],'blocked end insert must not mutate project');
const endOverwrite={duration:10,clips:[{id:'safe-tail',track:0,start:8,duration:2,asset:'tail.mp4'}]};const endOverwriteResult=Placement.overwriteRange(endOverwrite,0,9.9,2,ops);assert.equal(endOverwriteResult.ok,false);assert.equal(endOverwriteResult.reason,'out-of-range');assert.equal(endOverwrite.clips[0].duration,2,'blocked short-tail overwrite must not mutate project');

const overwrite={duration:20,clips:[{id:'long',track:0,name:'Long',start:1,duration:10,asset:'long.mp4',sourceOffset:4,speed:2,fadeIn:.3,fadeOut:.4},{id:'other',track:1,start:2,duration:10,asset:'other.mp4'}]};
const over=Placement.overwriteRange(overwrite,0,4,3,ops);assert.equal(over.ok,true);
const pieces=overwrite.clips.filter(c=>c.track===0).sort((a,b)=>a.start-b.start);assert.equal(pieces.length,2,'overwrite through middle must preserve both outside pieces');
assert.equal(pieces[0].start,1);assert.equal(pieces[0].duration,3);assert.equal(pieces[1].start,7);assert.equal(pieces[1].duration,4);
assert.equal(pieces[1].sourceOffset,16,'right piece must continue at correct source offset after overwrite');
assert.equal(overwrite.clips.find(c=>c.id==='other').start,2,'overwrite must not affect other tracks');

const mixed={duration:12,clips:[{id:'inside',track:0,start:3,duration:2,asset:'x'},{id:'edge',track:0,start:5,duration:4,asset:'y',sourceOffset:1},{id:'safe',track:0,start:10,duration:1,asset:'z'}]};
const mixedResult=Placement.overwriteRange(mixed,0,2,5,ops);assert.equal(mixedResult.ok,true);assert.equal(mixed.clips.some(c=>c.id==='inside'),false,'fully covered clip must be removed');
const edge=mixed.clips.find(c=>c.id==='edge');assert.ok(edge);assert.equal(edge.start,7);assert.equal(edge.duration,2);assert.equal(edge.sourceOffset,3,'right-edge trim must advance source offset');assert.equal(mixed.clips.find(c=>c.id==='safe').start,10);
console.log('media placement ok');
