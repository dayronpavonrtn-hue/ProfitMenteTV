import assert from 'node:assert/strict';
import './timeline-operations.js';
const Ops=globalThis.ProfitMenteTimelineOperations;
assert.ok(Ops,'Timeline operations engine was not exported');
const ops=new Ops();
const project={duration:20,clips:[
 {id:'a',track:0,name:'A',start:0,duration:4,asset:'v1'},
 {id:'b',track:0,name:'B',start:6,duration:3,asset:'v2'},
 {id:'c',track:0,name:'C',start:12,duration:2,asset:'v3'},
 {id:'music',track:5,name:'Music',start:1,duration:10,asset:'m1'}
]};
ops.copy(project.clips[0]);
const pasted=ops.paste(project,15,0);
assert.equal(pasted.track,0);assert.equal(pasted.start,15);assert.notEqual(pasted.id,'a');assert.equal(pasted.asset,'v1');
ops.rippleDelete(project,'b');
assert.equal(project.clips.some(c=>c.id==='b'),false);
assert.equal(project.clips.find(c=>c.id==='c').start,9,'later clips on same track must shift left by deleted duration');
assert.equal(project.clips.find(c=>c.id==='music').start,1,'other tracks must not shift during ripple delete');
const moved=ops.closeGaps(project,0);
assert.ok(moved>=1);const visual=project.clips.filter(c=>c.track===0).sort((a,b)=>a.start-b.start);for(let i=1;i<visual.length;i++)assert.ok(visual[i].start<=visual[i-1].start+visual[i-1].duration+.001,'gaps should be closed');

const splitProject={duration:30,clips:[{id:'video',track:0,name:'Scene',start:2,duration:8,asset:'v',sourceOffset:3,speed:1.5,transition:'fade',fadeIn:.4,fadeOut:.7,keyframes:{start:{positionX:0,scale:1,opacity:1},end:{positionX:40,scale:2,opacity:.5}}}]};
const split=ops.split(splitProject,'video',5);
assert.ok(split,'split should succeed inside clip');
assert.equal(split.left.duration,3);assert.equal(split.right.start,5);assert.equal(split.right.duration,5);
assert.equal(split.right.sourceOffset,7.5,'right half must continue from the correct source time at current speed');
assert.equal(split.left.transition,'fade');assert.equal(split.right.transition,'cut','right half must not replay the entrance transition');
assert.equal(split.left.fadeIn,.4);assert.equal(split.left.fadeOut,0);assert.equal(split.right.fadeIn,0);assert.equal(split.right.fadeOut,.7);
assert.equal(split.left.keyframes.end.positionX,15);assert.equal(split.right.keyframes.start.positionX,15,'keyframe transform must stay continuous at the cut');
assert.equal(split.left.keyframes.end.scale,1.375);assert.equal(split.right.keyframes.start.scale,1.375);
assert.equal(ops.split(splitProject,split.left.id,2.01),null,'cuts too close to a clip edge must be rejected');

const defaultOffsetProject={duration:20,clips:[{id:'plain',track:0,name:'Plain',start:1,duration:8,asset:'plain.mp4'}]};
const defaultOffsetSplit=ops.split(defaultOffsetProject,'plain',4);
assert.ok(defaultOffsetSplit);
assert.equal(defaultOffsetSplit.right.sourceOffset,3,'a split must advance the source even when the original omitted the default zero sourceOffset');
const speedOnlyProject={duration:20,clips:[{id:'fast',track:0,name:'Fast',start:2,duration:6,asset:'fast.mp4',speed:2}]};
const speedOnlySplit=ops.split(speedOnlyProject,'fast',4);
assert.equal(speedOnlySplit.right.sourceOffset,4,'default sourceOffset must still account for playback speed');

const captionProject={duration:10,clips:[{id:'cap',track:3,name:'uno dos tres',start:0,duration:6,wordTimings:[
 {word:'uno',start:.2,end:1.3,duration:1.1,index:0},{word:'dos',start:2,end:3.4,duration:1.4,index:1},{word:'tres',start:4,end:5.5,duration:1.5,index:2}
]}]};
const capSplit=ops.split(captionProject,'cap',3);
assert.ok(capSplit);assert.equal(capSplit.left.name,'uno dos');assert.equal(capSplit.right.name,'tres');
assert.ok(capSplit.left.wordTimings.every(w=>w.start>=0&&w.end<=3));assert.ok(capSplit.right.wordTimings.every(w=>w.start>=3&&w.end<=6),'caption word timings must remain inside their split segment');
assert.deepEqual(capSplit.left.wordTimings.map(w=>w.index),[0,1]);assert.deepEqual(capSplit.right.wordTimings.map(w=>w.index),[0],'caption word indexes must be normalized inside each split segment');

const trimProject={duration:20,clips:[{id:'trim',track:0,name:'Trim',start:2,duration:8,asset:'v',sourceOffset:1,speed:2,fadeIn:.5,fadeOut:.8,keyframes:{start:{positionX:0,scale:1},end:{positionX:80,scale:2}}}]};
const leftTrim=ops.trimLeft(trimProject,'trim',4);
assert.ok(leftTrim);assert.equal(leftTrim.start,4);assert.equal(leftTrim.duration,6);assert.equal(leftTrim.sourceOffset,5,'left trim must advance source by removed timeline duration at clip speed');
assert.equal(leftTrim.keyframes.start.positionX,20);assert.equal(leftTrim.keyframes.start.scale,1.25,'left trim must preserve transform continuity');
const rightTrim=ops.trimRight(trimProject,'trim',8);
assert.ok(rightTrim);assert.equal(rightTrim.start,4);assert.equal(rightTrim.duration,4);assert.equal(rightTrim.sourceOffset,5,'right trim must not move source in-point');
assert.ok(Math.abs(rightTrim.keyframes.end.positionX-60)<1e-9);assert.ok(Math.abs(rightTrim.keyframes.end.scale-1.75)<1e-9,'right trim must preserve transform continuity');
assert.equal(ops.trimLeft(trimProject,'trim',7.9),null,'trim must reject changes that leave less than minimum clip duration');

const trimCaptionProject={duration:10,clips:[{id:'trimcap',track:3,name:'uno dos tres',start:0,duration:6,wordTimings:[
 {word:'uno',start:.2,end:1.3,duration:1.1,index:0},{word:'dos',start:2,end:3.4,duration:1.4,index:1},{word:'tres',start:4,end:5.5,duration:1.5,index:2}
]}]};
ops.trimLeft(trimCaptionProject,'trimcap',1);assert.equal(trimCaptionProject.clips[0].name,'uno dos tres');assert.equal(trimCaptionProject.clips[0].wordTimings[0].start,1);
ops.trimRight(trimCaptionProject,'trimcap',4.8);assert.equal(trimCaptionProject.clips[0].name,'uno dos tres');assert.equal(trimCaptionProject.clips[0].wordTimings.at(-1).end,4.8);assert.deepEqual(trimCaptionProject.clips[0].wordTimings.map(w=>w.index),[0,1,2]);
console.log('timeline operations ok');