import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const Engine=require('./auto-finish-engine.js');

const base={clips:[],markers:[],trackState:{}};
assert.deepEqual(Engine.plan(base,[]).steps,['repair','qa']);
assert.deepEqual(Engine.plan(base,[{id:'img',type:'image'}]).steps,['repair','fill-visual-gaps','qa']);
assert.deepEqual(Engine.plan(base,[{id:'music',type:'audio'}]).steps,['repair','qa']);
assert.deepEqual(Engine.plan(base,[{id:'voice',type:'audio'},{id:'sfx',type:'audio'}]).steps,['repair','qa']);
assert.equal(Engine.inspect(base,[{id:'music',type:'audio'}]).visualAssets,0);
assert.equal(Engine.inspect(base,[{id:'video',type:'VIDEO'}]).visualAssets,1);

const av={...base,clips:[
  {id:'v1',track:0,asset:'img',sceneText:'a'},
  {id:'v2',track:0,asset:'img',sceneText:'b'},
  {id:'m',track:5,asset:'music'},
  {id:'vo',track:6,asset:'voice'}
]};
assert.deepEqual(Engine.plan(av,[]).steps,['repair','smart-mix','detect-beats','sync-beats','auto-transitions','audio-headroom','qa']);
assert.deepEqual(Engine.plan(av,[{id:'img',type:'image'}]).steps,['repair','fill-visual-gaps','smart-mix','detect-beats','sync-beats','auto-transitions','audio-headroom','qa']);
assert.deepEqual(Engine.plan(av,[{id:'music',type:'audio'}]).steps,['repair','smart-mix','detect-beats','sync-beats','auto-transitions','audio-headroom','qa']);
assert.deepEqual(Engine.plan(av,[{id:'img',type:'image'},{id:'music',type:'audio'},{id:'voice',type:'audio'}]).steps,['repair','fill-visual-gaps','smart-mix','detect-beats','sync-beats','auto-transitions','audio-headroom','qa']);

const withBeats={...av,markers:[{time:1,label:'Beat 1'}]};
assert.deepEqual(Engine.plan(withBeats,[]).steps,['repair','smart-mix','sync-beats','auto-transitions','audio-headroom','qa']);

const mutedMusic={...av,trackState:{5:{muted:true}}};
assert.deepEqual(Engine.plan(mutedMusic,[]).steps,['repair','detect-beats','sync-beats','auto-transitions','audio-headroom','qa']);

const manual={...base,clips:[{track:0,asset:'v'},{track:5,asset:'m'}]};
assert.deepEqual(Engine.plan(manual,[]).steps,['repair','detect-beats','audio-headroom','qa']);

const onlySfx={...base,clips:[{track:4,asset:'hit'}]};
assert.deepEqual(Engine.plan(onlySfx,[]).steps,['repair','detect-beats','audio-headroom','qa']);

const upperVisual={...base,clips:[{track:2,asset:'overlay'},{track:3,asset:'logo'}]};
assert.equal(Engine.inspect(upperVisual,[]).visual,2);

const legacyMuted={...av,trackState:{5:{muted:false}},trackStates:{5:{muted:true}}};
assert.deepEqual(Engine.plan(legacyMuted,[]).steps,['repair','detect-beats','sync-beats','auto-transitions','audio-headroom','qa']);

const soloVoice={...av,trackState:{6:{solo:true}}};
assert.deepEqual(Engine.plan(soloVoice,[]).steps,['repair','detect-beats','sync-beats','auto-transitions','audio-headroom','qa']);
assert.equal(Engine.inspect(soloVoice,[]).music,0);
assert.equal(Engine.inspect(soloVoice,[]).voice,1);

const soloUpper={...base,clips:[
  {track:0,asset:'hidden-gen-a',sceneText:'a'},
  {track:0,asset:'hidden-gen-b',sceneText:'b'},
  {track:2,asset:'active-gen',sceneText:'c'},
  {track:6,asset:'voice'}
],trackState:{2:{solo:true}}};
assert.equal(Engine.inspect(soloUpper,[]).visual,1);
assert.equal(Engine.inspect(soloUpper,[]).generated,1);
assert.deepEqual(Engine.plan(soloUpper,[]).steps,['repair','detect-beats','audio-headroom','qa']);

const legacyHiddenGenerated={...av,trackState:{0:{hidden:false}},trackStates:{0:{hidden:true}}};
assert.equal(Engine.inspect(legacyHiddenGenerated,[]).generated,0);
assert.deepEqual(Engine.plan(legacyHiddenGenerated,[]).steps,['repair','smart-mix','detect-beats','audio-headroom','qa']);

const paddedLegacyMusic={...av,trackState:{'05':{muted:true}}};
assert.equal(Engine.inspect(paddedLegacyMusic,[]).music,0);
assert.deepEqual(Engine.plan(paddedLegacyMusic,[]).steps,['repair','detect-beats','sync-beats','auto-transitions','audio-headroom','qa']);
const paddedLegacyVisual={...av,trackStates:{'+00.0':{hidden:true}}};
assert.equal(Engine.inspect(paddedLegacyVisual,[]).generated,0);
assert.deepEqual(Engine.plan(paddedLegacyVisual,[]).steps,['repair','smart-mix','detect-beats','audio-headroom','qa']);

const zeroMedia={...base,clips:[{track:'00',asset:0,sceneText:'generated'}]};
assert.equal(Engine.inspect(zeroMedia,[{id:0,type:'image'}]).visual,1);
assert.equal(Engine.inspect(zeroMedia,[{id:0,type:'image'}]).visualAssets,1);
assert.deepEqual(Engine.plan(zeroMedia,[{id:0,type:'image'}]).steps,['repair','fill-visual-gaps','qa']);

assert.equal(Engine.hasMediaId(false),false);
assert.equal(Engine.hasMediaId('   '),false);
assert.equal(Engine.hasMediaId({}),false);
assert.equal(Engine.hasMediaId([]),false);
assert.equal(Engine.hasMediaId(NaN),false);
assert.equal(Engine.hasMediaId(Infinity),false);
assert.equal(Engine.hasMediaId(1.5),false);
assert.equal(Engine.hasMediaId(Number.MAX_SAFE_INTEGER+1),false);
assert.equal(Engine.canonicalTrack(false),null);
assert.equal(Engine.canonicalTrack(''),null);
assert.equal(Engine.canonicalTrack({valueOf:()=>0}),null);
assert.equal(Engine.canonicalTrack([]),null);
assert.equal(Engine.canonicalTrack([5]),null);
assert.equal(Engine.canonicalTrack('05'),5);
assert.equal(Engine.canonicalTrack('+00.0'),0);
assert.equal(Engine.mediaKey('007'),Engine.mediaKey(7));
assert.equal(Engine.mediaKey('+08.0'),Engine.mediaKey(8));
assert.equal(Engine.mediaKey(false),null);
assert.equal(Engine.inspect({...base,clips:[
  {track:false,asset:'bad'},
  {track:'',asset:'bad'},
  {track:{valueOf:()=>0},asset:'bad'},
  {track:0,asset:{}},
  {track:5,asset:[]},
  {track:6,asset:Number.MAX_SAFE_INTEGER+1}
]},[{id:false,type:'image'},{id:'   ',type:'video'},{id:{},type:'image'},{id:[],type:'video'}]).visual,0);
assert.equal(Engine.inspect(base,[{id:false,type:'image'},{id:'   ',type:'video'},{id:{},type:'image'},{id:[],type:'video'},{id:1.5,type:'image'}]).visualAssets,0);
assert.deepEqual(Engine.plan({...base,clips:[{track:5,asset:{}},{track:6,asset:[]}]},[]).steps,['repair','qa']);

const unfinishedScenes={...base,duration:12,clips:[
  {id:'s1',track:0,asset:'primary',sceneText:'Primera escena',start:0,duration:5},
  {id:'s2',track:0,asset:'primary',sceneText:'Segunda escena',start:5,duration:5},
  {id:'c1',track:3,name:'Primera escena',start:.1,duration:4.8}
]};
const unfinishedState=Engine.inspect(unfinishedScenes,[{id:'primary',type:'video',duration:20},{id:'overlay',type:'image'}]);
assert.equal(unfinishedState.scenes,2);
assert.equal(unfinishedState.missingCaptions,1);
assert.equal(unfinishedState.missingBroll,2);
assert.deepEqual(Engine.plan(unfinishedScenes,[{id:'primary',type:'video',duration:20},{id:'overlay',type:'image'}]).steps,['repair','scene-captions','scene-broll','fill-visual-gaps','auto-transitions','qa']);

const completedScenes={...unfinishedScenes,clips:[...unfinishedScenes.clips,
  {id:'c2',track:3,name:'Segunda escena',start:5.1,duration:4.7},
  {id:'b1',track:1,asset:'overlay',start:1,duration:1},
  {id:'b2',track:1,asset:'overlay',start:6,duration:1}
]};
assert.equal(Engine.inspect(completedScenes,[{id:'overlay',type:'image'}]).missingCaptions,0);
assert.equal(Engine.inspect(completedScenes,[{id:'overlay',type:'image'}]).missingBroll,0);
assert.deepEqual(Engine.plan(completedScenes,[{id:'overlay',type:'image'}]).steps,['repair','fill-visual-gaps','auto-transitions','qa']);

const phantomHelpers={...unfinishedScenes,clips:[...unfinishedScenes.clips,
  {id:'empty-caption',track:3,start:5,duration:4.5,name:'',wordTimings:[]},
  {id:'missing-broll',track:1,start:1,duration:2,asset:'missing'},
  {id:'tiny-broll',track:1,start:6,duration:.01,asset:'overlay'}
]};
const phantomState=Engine.inspect(phantomHelpers,[{id:'overlay',type:'image'}]);
assert.equal(phantomState.missingCaptions,1,'caption vacío no debe cubrir una escena');
assert.equal(phantomState.missingBroll,2,'B-roll ausente o casi vacío no debe cubrir escenas');
assert.deepEqual(Engine.plan(phantomHelpers,[{id:'overlay',type:'image'}]).steps,['repair','scene-captions','scene-broll','fill-visual-gaps','auto-transitions','qa']);

const timedCaption={...unfinishedScenes,clips:[...unfinishedScenes.clips,{id:'timed',track:3,start:5,duration:4.5,wordTimings:[{word:'Segunda',duration:.3}]}]};
assert.equal(Engine.inspect(timedCaption,[{id:'overlay',type:'image'}]).missingCaptions,0,'word timings útiles deben contar como caption válido');

const legacyBroll={...unfinishedScenes,clips:[...unfinishedScenes.clips,{id:'legacy-b',track:1,start:1,duration:1,asset:'007'}]};
assert.equal(Engine.inspect(legacyBroll,[{id:7,type:'video'}]).missingBroll,1,'IDs legacy equivalentes deben reconocer cobertura válida de una escena');

const protectedScenes={...unfinishedScenes,trackState:{1:{locked:true},3:{locked:true}}};
const protectedState=Engine.inspect(protectedScenes,[{id:'overlay',type:'image'}]);
assert.equal(protectedState.captionTrackLocked,true);
assert.equal(protectedState.brollTrackLocked,true);
assert.equal(protectedState.missingCaptions,0);
assert.equal(protectedState.missingBroll,0);
assert.deepEqual(Engine.plan(protectedScenes,[{id:'overlay',type:'image'}]).steps,['repair','fill-visual-gaps','auto-transitions','qa']);

const hiddenHelpers={...unfinishedScenes,trackState:{1:{hidden:true},3:{hidden:true}}};
const hiddenHelperState=Engine.inspect(hiddenHelpers,[{id:'overlay',type:'image'}]);
assert.equal(hiddenHelperState.captionTrackActive,false);
assert.equal(hiddenHelperState.brollTrackActive,false);
assert.equal(hiddenHelperState.missingCaptions,0);
assert.equal(hiddenHelperState.missingBroll,0);
assert.deepEqual(Engine.plan(hiddenHelpers,[{id:'overlay',type:'image'}]).steps,['repair','fill-visual-gaps','auto-transitions','qa']);

const soloPrimary={...unfinishedScenes,trackState:{0:{solo:true}}};
const soloPrimaryState=Engine.inspect(soloPrimary,[{id:'overlay',type:'image'}]);
assert.equal(soloPrimaryState.scenes,2);
assert.equal(soloPrimaryState.captionTrackActive,false);
assert.equal(soloPrimaryState.brollTrackActive,false);
assert.equal(soloPrimaryState.missingCaptions,0);
assert.equal(soloPrimaryState.missingBroll,0);
assert.deepEqual(Engine.plan(soloPrimary,[{id:'overlay',type:'image'}]).steps,['repair','fill-visual-gaps','auto-transitions','qa']);

const inactiveScenes={...unfinishedScenes,trackState:{0:{hidden:true}}};
assert.equal(Engine.inspect(inactiveScenes,[{id:'overlay',type:'image'}]).scenes,0);
assert.equal(Engine.inspect(inactiveScenes,[{id:'overlay',type:'image'}]).missingCaptions,0);
assert.equal(Engine.inspect(inactiveScenes,[{id:'overlay',type:'image'}]).missingBroll,0);

console.log('auto-finish-engine regression: ok');
