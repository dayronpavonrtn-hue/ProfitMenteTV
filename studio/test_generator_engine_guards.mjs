import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('./generator-engine.js',import.meta.url),'utf8');
const context={window:{},globalThis:{},crypto:{randomUUID:()=>`id-${Math.random()}`}};
context.globalThis=context;
vm.createContext(context);
vm.runInContext(source,context,{filename:'generator-engine.js'});
const Engine=context.window.ProfitMenteGeneratorEngine;
assert.equal(typeof Engine,'function');
const engine=new Engine();

assert.equal(engine.trackLocked({trackStates:{'6.0':{locked:true}}},6),true,'legacy narration track alias must be treated as locked');
assert.equal(engine.trackLocked({trackState:{'04':{locked:true}}},4),true,'legacy SFX track alias must be treated as locked');
assert.equal(engine.trackLocked({trackState:{'05':{locked:true}}},5),true,'legacy music track alias must be treated as locked');
assert.equal(engine.trackLocked({trackState:{'1.5':{locked:true}}},1),false,'fractional aliases must not collapse onto a real track');
assert.equal(engine.trackLocked({trackState:{'07':{locked:true}}},0),false,'out-of-range aliases must not lock track zero');

const voice={id:'voice-1',type:'audio',name:'voice final.wav',duration:45};
const lockedNarration={duration:45,trackStates:{'6.0':{locked:true}},clips:[{id:'voice',track:6,asset:null,duration:45,start:0}]};
assert.equal(engine.assignNarration(lockedNarration,[voice]),0,'legacy locked narration track must never be mutated');
assert.equal(lockedNarration.clips[0].asset,null);

const zeroNarration={duration:45,clips:[{id:'voice-zero',track:6,asset:0,duration:45,start:0}]};
assert.equal(engine.assignNarration(zeroNarration,[voice]),0,'numeric media ID 0 must count as an existing narration assignment');
assert.equal(zeroNarration.clips[0].asset,0);

const music={id:'music-1',type:'audio',name:'background music.wav',duration:60};
const zeroMusic={duration:45,clips:[{id:'music-zero',track:5,asset:0,duration:45,start:0}]};
assert.equal(engine.assignSoundtrack(zeroMusic,[music]),0,'numeric media ID 0 must prevent duplicate soundtrack insertion');
assert.equal(zeroMusic.clips.length,1);

const sfx={id:'sfx-1',type:'audio',name:'transition whoosh.wav',duration:.5};
const zeroSfx={duration:10,clips:[
  {id:'scene-a',track:0,asset:'v1',start:0,duration:5},
  {id:'scene-b',track:0,asset:'v2',start:5,duration:5},
  {id:'sfx-zero',track:4,asset:0,start:4.9,duration:.5}
]};
assert.equal(engine.assignTransitionSfx(zeroSfx,[sfx]),0,'numeric media ID 0 must prevent duplicate automatic transition SFX');
assert.equal(zeroSfx.clips.length,3);

const image={id:'image-1',type:'image',name:'scene image'};
const zeroVisual={name:'zero visual',format:'9:16',clips:[
  {id:'scene-zero',track:0,asset:0,start:0,duration:3,keywords:[]},
  {id:'scene-open',track:0,asset:null,start:3,duration:3,keywords:[]}
]};
const assigned=engine.assignAssets(zeroVisual,[image]);
assert.equal(zeroVisual.clips[0].asset,0,'numeric media ID 0 must never be overwritten by automatic visual assignment');
assert.equal(zeroVisual.clips[1].asset,'image-1');
assert.equal(assigned.primary,1);

console.log('generator engine guard tests passed');
