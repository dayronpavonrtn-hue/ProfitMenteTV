import assert from 'node:assert/strict';
import './slide-edit-engine.js';
const E=globalThis.ProfitMenteSlideEditEngine,engine=new E();
const assets=[{id:'a',type:'video',duration:20},{id:'b',type:'video',duration:20},{id:'c',type:'video',duration:20}];
const project={duration:12,clips:[
 {id:'l',track:0,asset:'a',start:0,duration:4,sourceOffset:1,speed:1,wordTimings:[{start:1,end:2}]},
 {id:'m',track:0,asset:'b',start:4,duration:3,sourceOffset:2,speed:1,wordTimings:[{start:4.5,end:5}]},
 {id:'r',track:0,asset:'c',start:7,duration:5,sourceOffset:3,speed:1,wordTimings:[{start:7.2,end:8}]}
]};
let r=engine.slide(project,'m',assets,1);
assert.equal(r.ok,true);assert.equal(r.changed,true);assert.equal(r.delta,1);assert.equal(project.duration,12);
assert.equal(project.clips[0].duration,5);assert.equal(project.clips[1].start,5);assert.equal(project.clips[1].duration,3);assert.equal(project.clips[2].start,8);assert.equal(project.clips[2].duration,4);assert.equal(project.clips[2].sourceOffset,4);assert.equal(project.clips[1].wordTimings[0].start,5.5);
r=engine.slide(project,'m',assets,-2);assert.equal(r.ok,true);assert.equal(project.clips[0].duration,3);assert.equal(project.clips[1].start,3);assert.equal(project.clips[2].start,6);assert.equal(project.clips[2].duration,6);assert.equal(project.clips[2].sourceOffset,2);
const clamp={duration:6,clips:[{id:'l',track:0,asset:'a',start:0,duration:2,sourceOffset:17.5,speed:1},{id:'m',track:0,asset:'b',start:2,duration:2,sourceOffset:0,speed:1},{id:'r',track:0,asset:'c',start:4,duration:2,sourceOffset:.25,speed:1}]};
r=engine.slide(clamp,'m',assets,5);assert.equal(r.delta,.5,'left source handle limits slide right');assert.equal(r.clamped,true);
r=engine.slide(clamp,'m',assets,-5);assert.equal(r.delta,-.75,'current right source offset after prior slide permits .75s slide left');assert.equal(r.clamped,true);
const locked={duration:6,clips:[{id:'l',track:0,start:0,duration:2},{id:'m',track:0,start:2,duration:2},{id:'r',track:0,start:4,duration:2,locked:true}]};
assert.equal(engine.slide(locked,'m',[],.1).reason,'locked');
const invalid={duration:6,clips:[{id:'l',track:0,start:0,duration:2},{id:'m',track:0,start:2,duration:2},{id:'r',track:0,start:4,duration:2}]};
const before=JSON.stringify(invalid);assert.equal(engine.slide(invalid,'m',[],[.1]).reason,'invalid-delta');assert.equal(JSON.stringify(invalid),before,'invalid input must be atomic');
assert.equal(engine.slide(invalid,{toString:()=> 'm'},[],.1).reason,'invalid-id');
assert.equal(engine.context({clips:[{id:'l',track:0,start:0,duration:2},{id:'m',track:0,start:2.2,duration:2},{id:'r',track:0,start:4.2,duration:2}]},'m',[]).reason,'needs-two-adjacent');
console.log('ProfitMente slide edit QA passed');