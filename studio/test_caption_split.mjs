import {createRequire} from 'node:module';import assert from 'node:assert/strict';const require=createRequire(import.meta.url);const Engine=require('./caption-split-engine.js');const e=new Engine();
const base=()=>({fps:30,duration:10,clips:[{id:'cap',track:3,name:'uno dos tres cuatro',start:1,duration:2,wordTimings:[{word:'uno',start:1,end:1.4},{word:'dos',start:1.4,end:1.9},{word:'tres',start:1.9,end:2.4},{word:'cuatro',start:2.4,end:3}]},{id:'v',track:0,name:'video',start:0,duration:5}]});
let p=base(),r=e.split(p,'cap',2,{idFactory:()=> 'cap-b'});assert.equal(r.ok,true);assert.equal(p.clips.length,3);assert.equal(r.split,2);assert.equal(r.left.name,'uno dos tres');assert.equal(r.right.name,'tres cuatro');assert.equal(r.left.duration,1);assert.equal(r.right.start,2);assert.equal(r.right.duration,1);assert.equal(r.left.wordTimings.at(-1).end,2);assert.equal(r.right.wordTimings[0].start,2);assert.equal(r.left.wordTimings[0].index,0);assert.equal(r.right.wordTimings[0].index,0);
p=base();r=e.split(p,'cap',2.016,{idFactory:()=> 'cap-b'});assert.equal(r.ok,true);assert.equal(r.split,2); // frame snap at 30 fps
p=base();const before=JSON.stringify(p);r=e.split(p,'cap',1.01,{idFactory:()=> 'cap-b'});assert.equal(r.reason,'too-close-to-edge');assert.equal(JSON.stringify(p),before);
p=base();p.clips[0].locked=true;r=e.split(p,'cap',2,{idFactory:()=> 'cap-b'});assert.equal(r.reason,'locked');
p=base();p.trackState={'3':{locked:true}};r=e.split(p,'cap',2,{idFactory:()=> 'cap-b'});assert.equal(r.reason,'locked');
p=base();delete p.clips[0].wordTimings;r=e.split(p,'cap',2,{idFactory:()=> 'cap-b'});assert.equal(r.ok,true);assert.equal(r.left.name,'uno dos');assert.equal(r.right.name,'tres cuatro');
p=base();delete p.clips[0].wordTimings;p.clips[0].name='solo';r=e.split(p,'cap',2,{idFactory:()=> 'cap-b'});assert.equal(r.reason,'text-too-short');
p=base();p.clips[1].id='00';p.clips[0].id=0;r=e.split(p,0,2,{idFactory:()=> 'cap-b'});assert.equal(r.reason,'ambiguous-id');
p=base();r=e.split(p,'cap',true,{idFactory:()=> 'cap-b'});assert.equal(r.reason,'invalid-time');
p=base();r=e.split(p,'cap',2,{idFactory:()=> 'cap'});assert.equal(r.reason,'id-exhausted');
console.log('Caption split engine OK');
