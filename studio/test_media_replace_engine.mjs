import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);const Engine=require('./media-replace-engine.js');
const near=(actual,expected,eps=1e-9)=>assert.ok(Math.abs(actual-expected)<=eps,`expected ${actual} ≈ ${expected}`);

const baseClip={id:'c1',track:0,asset:'old',name:'Old',start:2,duration:6,sourceOffset:2,speed:1.5,scale:1.2,x:10,y:-4,rotation:3,transition:'fade',fadeIn:.4,fadeOut:.4,keyframes:{start:{scale:1},end:{scale:1.3}}};
const project={clips:[structuredClone(baseClip)]};
let r=Engine.replace(project,'c1',{id:'new-video',name:'New video',type:'video',duration:7});
assert.equal(r.ok,true);assert.equal(project.clips[0].asset,'new-video');assert.equal(project.clips[0].name,'New video');assert.equal(project.clips[0].scale,1.2);assert.equal(project.clips[0].transition,'fade');assert.deepEqual(project.clips[0].keyframes,baseClip.keyframes);assert.equal(project.clips[0].sourceOffset,2);near(project.clips[0].duration,(7-2)/1.5);assert.equal(r.trimmed,true);

const visual={clips:[{id:'v',track:1,asset:'x',duration:4,sourceOffset:3,speed:2,fadeIn:.5,fadeOut:.5}]};
r=Engine.replace(visual,'v',{id:'img',name:'Still',type:'image',duration:5});assert.equal(r.ok,true);assert.equal(visual.clips[0].sourceOffset,0);assert.equal(visual.clips[0].duration,4);

const audio={clips:[{id:'a',track:5,asset:'x',duration:8,sourceOffset:1,speed:1,volume:.7}]};
r=Engine.replace(audio,'a',{id:'voice',name:'Voice',type:'audio',duration:4});assert.equal(r.ok,true);assert.equal(audio.clips[0].duration,3);assert.equal(audio.clips[0].volume,.7);

const incompatible={clips:[{id:'x',track:5,asset:'a',duration:2}]};r=Engine.replace(incompatible,'x',{id:'pic',name:'Pic',type:'image',duration:5});assert.equal(r.ok,false);assert.equal(r.reason,'incompatible');assert.equal(incompatible.clips[0].asset,'a');
assert.equal(Engine.replace({clips:[]},'missing',{id:'a',type:'audio'}).reason,'clip-missing');
console.log('media replace engine ok');
