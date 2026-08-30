import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);const {ProfitMenteClipboardEngine}=require('./clipboard-engine.js');

const e=new ProfitMenteClipboardEngine();
const source=[
  {id:'a',track:0,name:'A',start:2,duration:2,asset:'v1',scale:1.2,keyframes:{start:{x:0},end:{x:20}}},
  {id:'b',track:2,name:'B',start:5,duration:1,asset:null,text:'Caption'}
];
let r=e.copy(source);assert.equal(r.copied,2);assert.equal(r.span,4);
const p={duration:12,clips:[],trackState:{}};r=e.paste(p,7);assert.equal(r.ok,true);assert.equal(r.clips.length,2);assert.equal(r.clips[0].start,7);assert.equal(r.clips[1].start,10);assert.equal(r.clips[0].scale,1.2);assert.deepEqual(r.clips[0].keyframes,source[0].keyframes);assert.notEqual(r.clips[0].id,'a');assert.notEqual(r.clips[1].id,'b');

const nearEnd={duration:8,clips:[],trackState:{}};r=e.paste(nearEnd,7.5);assert.equal(r.ok,true);assert.equal(r.base,4);assert.equal(r.clamped,true);assert.equal(r.clips[0].start,4);assert.equal(r.clips[1].start,7);

const locked={duration:12,clips:[],trackState:{2:{locked:true}}};r=e.paste(locked,1);assert.equal(r.ok,false);assert.equal(r.reason,'locked-tracks');assert.deepEqual(r.locked,[2]);assert.equal(locked.clips.length,0);

const tooLongEngine=new ProfitMenteClipboardEngine();tooLongEngine.copy([{id:'x',track:0,start:0,duration:9}]);r=tooLongEngine.paste({duration:5,clips:[],trackState:{}},0);assert.equal(r.ok,false);assert.equal(r.reason,'too-long');
const empty=new ProfitMenteClipboardEngine();assert.equal(empty.paste({duration:10,clips:[]},0).reason,'empty');

// A pasted group must never stay linked to the source group.
const groupedEngine=new ProfitMenteClipboardEngine();
const grouped=[
  {id:'g1',track:0,name:'G1',start:1,duration:2,groupId:'source-group'},
  {id:'g2',track:1,name:'G2',start:2,duration:1,groupId:'source-group'}
];
groupedEngine.copy(grouped);const groupedProject={duration:12,clips:structuredClone(grouped),trackState:{}};
r=groupedEngine.paste(groupedProject,5);assert.equal(r.ok,true);assert.equal(r.remappedGroups,1);assert.ok(r.clips[0].groupId);assert.equal(r.clips[0].groupId,r.clips[1].groupId);assert.notEqual(r.clips[0].groupId,'source-group');assert.equal(groupedProject.clips[0].groupId,'source-group');

// Copying only one member of a group must not create an orphan or link back to the original.
const partialEngine=new ProfitMenteClipboardEngine();partialEngine.copy([grouped[0]]);r=partialEngine.paste({duration:10,clips:structuredClone(grouped),trackState:{}},6);assert.equal(r.ok,true);assert.equal(r.remappedGroups,0);assert.equal('groupId' in r.clips[0],false);

// Duplicate places a selection immediately after its occupied span, remaps groups and preserves the prior clipboard.
const duplicateEngine=new ProfitMenteClipboardEngine();duplicateEngine.copy([{id:'keep',track:0,start:0,duration:1,name:'Keep'}]);
const duplicateProject={duration:14,clips:structuredClone(grouped),trackState:{}};r=duplicateEngine.duplicate(duplicateProject,duplicateProject.clips);assert.equal(r.ok,true);assert.equal(r.duplicate,true);assert.equal(r.base,3);assert.deepEqual(r.clips.map(c=>c.start),[3,4]);assert.equal(r.remappedGroups,1);assert.notEqual(r.clips[0].groupId,'source-group');assert.equal(duplicateEngine.count,1);const savedPaste=duplicateEngine.paste({duration:10,clips:[],trackState:{}},0);assert.equal(savedPaste.clips[0].name,'Keep copia');

const duplicateLocked=new ProfitMenteClipboardEngine();const lockedProject={duration:10,clips:[{id:'l',track:3,start:1,duration:2}],trackState:{3:{locked:true}}};r=duplicateLocked.duplicate(lockedProject,lockedProject.clips);assert.equal(r.ok,false);assert.equal(r.reason,'locked-tracks');assert.equal(lockedProject.clips.length,1);
const noSpaceProject={duration:5,clips:[{id:'n',track:0,start:3,duration:2}],trackState:{}};r=new ProfitMenteClipboardEngine().duplicate(noSpaceProject,noSpaceProject.clips);assert.equal(r.ok,false);assert.equal(r.reason,'no-space');assert.equal(noSpaceProject.clips.length,1);

console.log('clipboard engine ok');