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
console.log('timeline operations ok');