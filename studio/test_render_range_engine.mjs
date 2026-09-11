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

const relativeProject={name:'Relative captions',duration:20,clips:[{id:'rel',track:3,name:'ONE CROSS TWO',start:10,duration:6,wordTimingMode:'relative',wordTimings:[
  {word:'ONE',start:.2,end:1.2,duration:1,index:0},
  {word:'CROSS',start:1.5,end:3.5,duration:2,index:1},
  {word:'TWO',start:4,end:5,duration:1,index:2}
]}]};
const relativeOut=Engine.extract(relativeProject,11,13,[]),relativeCaption=relativeOut.clips[0];
assert.equal(relativeCaption.start,0);assert.equal(relativeCaption.duration,2);assert.equal(relativeCaption.wordTimingMode,'relative');
assert.deepEqual(relativeCaption.wordTimings,[
  {word:'ONE',start:0,end:.2,duration:.2,index:0},
  {word:'CROSS',start:.5,end:2,duration:1.5,index:1}
]);

const legacyRelative={name:'Legacy relative',duration:20,clips:[{id:'legacy',track:3,name:'LEGACY MODE',start:10,duration:5,wordTimings:[{word:'LEGACY',start:0,end:1.5},{word:'MODE',start:2.5,end:4.5}]}]};
const legacyOut=Engine.extract(legacyRelative,11,13,[]).clips[0];
assert.deepEqual(legacyOut.wordTimings,[{word:'LEGACY',start:0,end:.5},{word:'MODE',start:1.5,end:2}]);

console.log('render range engine ok');
