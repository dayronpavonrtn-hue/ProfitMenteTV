import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import crypto from 'node:crypto';
globalThis.crypto=crypto;
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
console.log('clipboard engine ok');