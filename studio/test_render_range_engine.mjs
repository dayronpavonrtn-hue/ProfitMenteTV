import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);const Engine=require('./render-range-engine.js');
const project={name:'Demo',duration:20,format:'9:16',markers:[{id:'m1',time:3},{id:'m2',time:8},{id:'m3',time:17}],clips:[
  {id:'v1',track:0,asset:'vid',name:'Video',start:2,duration:10,sourceOffset:1,speed:2,scale:1.2},
  {id:'i1',track:1,asset:'img',name:'Still',start:9,duration:6,sourceOffset:9},
  {id:'a1',track:6,asset:'aud',name:'Voice',start:5,duration:8,sourceOffset:.5,speed:1},
  {id:'c1',track:3,name:'Caption',start:4,duration:8,wordTimings:[{word:'a',start:5,end:6},{word:'b',start:9,end:10},{word:'c',start:13,end:14}]},
  {id:'outside',track:0,asset:'vid',start:16,duration:2}
]};
const assets=[{id:'vid',type:'video'},{id:'img',type:'image'},{id:'aud',type:'audio'}];
assert.equal(Engine.normalize(project,0,0).duration,0);
const source=structuredClone(project),out=Engine.extract(project,6,12,assets);
assert.deepEqual(project,source,'extract must not mutate source project');assert.equal(out.duration,6);assert.equal(out.renderRange.sourceStart,6);assert.equal(out.clips.length,4);
const video=out.clips.find(c=>c.id==='v1');assert.equal(video.start,0);assert.equal(video.duration,6);assert.equal(video.sourceOffset,9);assert.equal(video.scale,1.2);
const image=out.clips.find(c=>c.id==='i1');assert.equal(image.start,3);assert.equal(image.duration,3);assert.equal(image.sourceOffset,0);
const audio=out.clips.find(c=>c.id==='a1');assert.equal(audio.start,0);assert.equal(audio.duration,6);assert.equal(audio.sourceOffset,1.5);
const caption=out.clips.find(c=>c.id==='c1');assert.equal(caption.start,0);assert.equal(caption.duration,6);assert.deepEqual(caption.wordTimings,[{word:'b',start:3,end:4}]);
assert.deepEqual(out.markers,[{id:'m2',time:2}]);assert.equal(out.workRange,undefined);assert.equal(Engine.valid(project,4,4.1),false);assert.equal(Engine.valid(project,4,4.25),true);
let d=Engine.previewDecision(project,6,12,8,false);assert.equal(d.action,'continue');assert.equal(d.time,8);
d=Engine.previewDecision(project,6,12,12,false);assert.equal(d.action,'stop');assert.equal(d.time,6);
d=Engine.previewDecision(project,6,12,12,true);assert.equal(d.action,'loop');assert.equal(d.time,6);
d=Engine.previewDecision(project,6,12,5.8,true);assert.equal(d.action,'seek-start');assert.equal(d.time,6);
d=Engine.previewDecision(project,6,6.1,6.05,true);assert.equal(d.action,'invalid');
console.log('render range engine ok');
