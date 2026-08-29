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

const overflow={duration:10,clips:[{id:'tail',track:0,start:7,duration:3,asset:'tail.mp4'}]};
const blocked=Placement.insertSpace(overflow,0,5,2,ops);assert.equal(blocked.ok,false);assert.equal(blocked.reason,'out-of-range');assert.equal(overflow.clips[0].start,7,'failed insert must not mutate project');

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
