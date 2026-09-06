import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const engineSource=fs.readFileSync(new URL('./generator-engine.js',import.meta.url),'utf8');
const autofillSource=fs.readFileSync(new URL('./generator-autofill.js',import.meta.url),'utf8');
const context={window:{},globalThis:{},crypto:{randomUUID:(()=>{let i=0;return()=>`id-${++i}`})()}};
context.globalThis=context;
vm.createContext(context);
vm.runInContext(engineSource,context,{filename:'generator-engine.js'});
vm.runInContext(autofillSource,context,{filename:'generator-autofill.js'});
const Engine=context.window.ProfitMenteGeneratorEngine;
const AutoFill=context.window.ProfitMenteGeneratorAutoFill;
assert.equal(typeof Engine,'function');
assert.equal(typeof AutoFill,'function');
const engine=new Engine();
const autofill=new AutoFill(engine);

assert.equal(engine.canonicalTrack(false),null);
assert.equal(engine.canonicalTrack(true),null);
assert.equal(engine.canonicalTrack(''),null);
assert.equal(engine.canonicalTrack('00'),'0');
assert.equal(engine.canonicalTrack('+06.0'),'6');
assert.equal(engine.canonicalTrack('-0'),'0');
assert.equal(engine.canonicalTrack('1.5'),null);
assert.equal(engine.canonicalTrack(7),null);

assert.equal(engine.mediaKey(false),null);
assert.equal(engine.mediaKey({id:7}),null);
assert.equal(engine.mediaKey(7),'n:7');
assert.equal(engine.mediaKey('007'),'n:7');
assert.equal(engine.mediaKey('+07.000'),'n:7');
assert.equal(engine.mediaKey('-0'),'n:0');
assert.equal(engine.mediaKey('Media-A'),'s:Media-A');
assert.notEqual(engine.mediaKey('Media-A'),engine.mediaKey('media-a'));

const image={id:'visual-1',type:'image',name:'scene image'};
const boolTrack={name:'bool track',format:'9:16',clips:[
  {id:'bad',track:false,asset:null,start:0,duration:3,keywords:[]},
  {id:'good',track:'00',asset:null,start:3,duration:3,keywords:[]}
]};
const assigned=engine.assignAssets(boolTrack,[image]);
assert.equal(boolTrack.clips[0].asset,null,'boolean false must not be treated as primary track 0');
assert.equal(boolTrack.clips[1].asset,'visual-1','legacy track alias 00 must still be eligible');
assert.equal(assigned.primary,1);

const voice={id:'voice-1',type:'audio',name:'voice final narration.wav',duration:45};
const narration={duration:45,clips:[
  {id:'bad-voice',track:true,asset:null,duration:45,start:0},
  {id:'good-voice',track:'+06.0',asset:null,duration:45,start:0}
]};
assert.equal(engine.assignNarration(narration,[voice]),1);
assert.equal(narration.clips[0].asset,null,'boolean true must not be treated as narration');
assert.equal(narration.clips[1].asset,'voice-1');

const music={id:'music-1',type:'audio',name:'background music.wav',duration:60};
const existingMusic={duration:45,clips:[{id:'music-zero',track:'05',asset:'+00.0',duration:45,start:0}]};
assert.equal(engine.assignSoundtrack(existingMusic,[music]),0,'legacy track and media aliases must prevent duplicate soundtrack');

const sfx={id:'sfx-1',type:'audio',name:'transition whoosh.wav',duration:.5};
const falseScene={duration:10,clips:[
  {id:'invalid',track:false,asset:'v0',start:0,duration:5},
  {id:'scene',track:0,asset:'v1',start:5,duration:5}
]};
assert.equal(engine.assignTransitionSfx(falseScene,[sfx]),0,'invalid boolean scene must not create a fake second scene');

assert.equal(engine.sameMedia(7,'007'),true,'numeric media aliases must resolve to one identity');
const locked={trackState:{'00':{locked:true}},trackStates:{'+0.0':{locked:true}}};
assert.equal(engine.trackLocked(locked,false),false,'boolean target must never inherit track zero lock');
assert.equal(engine.trackLocked(locked,'-0'),true,'legacy zero aliases must share lock identity');

assert.equal(autofill.canonicalTrack(false),null);
assert.equal(autofill.canonicalTrack('00'),'0');
assert.equal(autofill.canonicalTrack('-0'),'0');
assert.equal(autofill.mediaKey({id:7}),null);
assert.deepEqual(Array.from(autofill.assetsFromIds([{id:7,type:'image'},{id:'Media-A',type:'image'}],['007'])).map(a=>a.id),[7]);

const autoProject={mode:'Automático',clips:[
  {id:'invalid-primary',track:false,asset:null},
  {id:'valid-primary',track:'00',asset:null},
  {id:'invalid-voice',track:true,asset:null},
  {id:'valid-voice',track:'+06.0',asset:null}
]};
assert.equal(autofill.missing(autoProject),1,'autofill must ignore false as primary track');
assert.equal(autofill.needsAudio(autoProject),true,'autofill must recognize canonical narration alias');

console.log('generator identity tests passed');
