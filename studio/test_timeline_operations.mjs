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
const minimumTrim=ops.trimLeft(trimProject,'trim',7.9);assert.ok(minimumTrim);assert.equal(minimumTrim.duration,.25,'trim must clamp to the minimum clip duration');
assert.equal(ops.trimLeft(trimProject,'trim',minimumTrim.start),null,'a no-op trim must not create a project change');

const trimCaptionProject={duration:10,clips:[{id:'trimcap',track:3,name:'uno dos tres',start:0,duration:6,wordTimings:[
 {word:'uno',start:.2,end:1.3,duration:1.1,index:0},{word:'dos',start:2,end:3.4,duration:1.4,index:1},{word:'tres',start:4,end:5.5,duration:1.5,index:2}
]}]};
ops.trimLeft(trimCaptionProject,'trimcap',1);assert.equal(trimCaptionProject.clips[0].name,'uno dos tres');assert.equal(trimCaptionProject.clips[0].wordTimings[0].start,1);
ops.trimRight(trimCaptionProject,'trimcap',4.8);assert.equal(trimCaptionProject.clips[0].name,'uno dos tres');assert.equal(trimCaptionProject.clips[0].wordTimings.at(-1).end,4.8);assert.deepEqual(trimCaptionProject.clips[0].wordTimings.map(w=>w.index),[0,1,2]);

const groupedRipple={duration:20,clips:[
 {id:'gv',groupId:'linked-1',track:0,name:'Video linked',start:2,duration:4,asset:'v'},
 {id:'ga',groupId:'linked-1',track:'2',name:'Audio linked',start:2,duration:4,asset:'a'},
 {id:'gc',groupId:'linked-1',track:3,name:'Caption linked',start:2,duration:4},
 {id:'next-v',track:0,name:'Next video',start:8,duration:3,asset:'v2'},
 {id:'next-a',track:2,name:'Next audio',start:8,duration:3,asset:'a2'},
 {id:'next-c',track:'3',name:'Next caption',start:8,duration:3},
 {id:'bed',track:5,name:'Music bed',start:0,duration:15,asset:'music'}
]};
const groupedRemoved=ops.rippleDelete(groupedRipple,'gv');
assert.equal(groupedRemoved?.id,'gv');
assert.equal(groupedRipple.clips.some(c=>c.groupId==='linked-1'),false,'ripple delete must remove every member of a linked group');
assert.equal(groupedRipple.clips.find(c=>c.id==='next-v').start,4);
assert.equal(groupedRipple.clips.find(c=>c.id==='next-a').start,4,'linked audio track must ripple by the same group span');
assert.equal(groupedRipple.clips.find(c=>c.id==='next-c').start,4,'linked caption track must ripple by the same group span');
assert.equal(groupedRipple.clips.find(c=>c.id==='bed').start,0,'tracks outside the deleted group must remain untouched');

const unevenGroup={duration:30,clips:[
 {id:'uv',groupId:'uneven',track:0,start:2,duration:4},
 {id:'ua',groupId:'uneven',track:2,start:2,duration:5},
 {id:'uv2',track:0,start:9,duration:2},
 {id:'ua2',track:2,start:9,duration:2}
]};
ops.rippleDelete(unevenGroup,'ua');
assert.equal(unevenGroup.clips.find(c=>c.id==='uv2').start,4,'group ripple must use the complete shared group envelope');
assert.equal(unevenGroup.clips.find(c=>c.id==='ua2').start,4,'all represented tracks must keep downstream sync');

const lockedGroup={duration:20,clips:[
 {id:'lv',groupId:'locked-linked',track:0,start:2,duration:4},
 {id:'la',groupId:'locked-linked',track:2,start:2,duration:4,locked:true},
 {id:'lv2',track:0,start:8,duration:2},
 {id:'la2',track:2,start:8,duration:2}
]};
const lockedSnapshot=structuredClone(lockedGroup);
assert.equal(ops.rippleDelete(lockedGroup,'lv'),null,'one locked group member must block the entire ripple edit');
assert.deepEqual(lockedGroup,lockedSnapshot,'blocked grouped ripple delete must be atomic');

const lockedDownstream={duration:20,clips:[
 {id:'dv',groupId:'downstream',track:0,start:2,duration:4},
 {id:'da',groupId:'downstream',track:2,start:2,duration:4},
 {id:'dv2',track:0,start:8,duration:2,locked:true},
 {id:'da2',track:2,start:8,duration:2}
]};
const downstreamSnapshot=structuredClone(lockedDownstream);
assert.equal(ops.rippleDelete(lockedDownstream,'da'),null,'a locked downstream clip that would move must block grouped ripple');
assert.deepEqual(lockedDownstream,downstreamSnapshot,'downstream lock failure must leave every grouped clip untouched');

const durationRipple={duration:10,clips:[
 {id:'dr-a',track:0,start:0,duration:4},
 {id:'dr-b',track:0,start:4,duration:3},
 {id:'dr-c',track:0,start:7,duration:3}
]};
ops.rippleDelete(durationRipple,'dr-b');
assert.equal(durationRipple.clips.find(c=>c.id==='dr-c').start,4);
assert.equal(durationRipple.duration,7,'ripple delete must shrink a content-bound project duration so export has no stale blank tail');

const explicitTail={duration:15,clips:[
 {id:'et-a',track:0,start:0,duration:4},
 {id:'et-b',track:0,start:4,duration:3}
]};
ops.rippleDelete(explicitTail,'et-b');
assert.equal(explicitTail.duration,15,'an intentional project tail beyond actual content must be preserved');

const durationClose={duration:10,clips:[
 {id:'cg-a',track:0,start:0,duration:4},
 {id:'cg-b',track:0,start:7,duration:3}
]};
assert.equal(ops.closeGaps(durationClose,0),1);
assert.equal(durationClose.clips.find(c=>c.id==='cg-b').start,4);
assert.equal(durationClose.duration,7,'closing the final gap must update content-bound project duration');

const durationTrim={duration:10,clips:[{id:'dt',track:0,start:2,duration:8}]};
ops.trimRight(durationTrim,'dt',8);
assert.equal(durationTrim.duration,8,'trimming the last clip must shrink content-bound project duration');
console.log('timeline operations ok');