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
assert.deepEqual(Engine.plan(av,[]).steps,['repair','smart-mix','detect-beats','sync-beats','auto-transitions','qa']);
assert.deepEqual(Engine.plan(av,[{id:'img',type:'image'}]).steps,['repair','fill-visual-gaps','smart-mix','detect-beats','sync-beats','auto-transitions','qa']);
assert.deepEqual(Engine.plan(av,[{id:'music',type:'audio'}]).steps,['repair','smart-mix','detect-beats','sync-beats','auto-transitions','qa']);

const withBeats={...av,markers:[{time:1,label:'Beat 1'}]};
assert.deepEqual(Engine.plan(withBeats,[]).steps,['repair','smart-mix','sync-beats','auto-transitions','qa']);

const mutedMusic={...av,trackState:{5:{muted:true}}};
assert.deepEqual(Engine.plan(mutedMusic,[]).steps,['repair','detect-beats','sync-beats','auto-transitions','qa']);

const manual={...base,clips:[{track:0,asset:'v'},{track:5,asset:'m'}]};
assert.deepEqual(Engine.plan(manual,[]).steps,['repair','detect-beats','qa']);

// All four visual layers are part of the canonical Studio timeline.
const upperVisual={...base,clips:[{track:2,asset:'overlay'},{track:3,asset:'logo'}]};
assert.equal(Engine.inspect(upperVisual,[]).visual,2);

// Legacy restrictions remain conservative when modern state disagrees.
const legacyMuted={...av,trackState:{5:{muted:false}},trackStates:{5:{muted:true}}};
assert.deepEqual(Engine.plan(legacyMuted,[]).steps,['repair','detect-beats','sync-beats','auto-transitions','qa']);

// Audio Solo must prevent an inactive music track from triggering Smart Mix.
const soloVoice={...av,trackState:{6:{solo:true}}};
assert.deepEqual(Engine.plan(soloVoice,[]).steps,['repair','detect-beats','sync-beats','auto-transitions','qa']);
assert.equal(Engine.inspect(soloVoice,[]).music,0);
assert.equal(Engine.inspect(soloVoice,[]).voice,1);

// Visual Solo/legacy hidden state must not schedule transitions for inactive generated clips.
const soloUpper={...base,clips:[
  {track:0,asset:'hidden-gen-a',sceneText:'a'},
  {track:0,asset:'hidden-gen-b',sceneText:'b'},
  {track:2,asset:'active-gen',sceneText:'c'},
  {track:6,asset:'voice'}
],trackState:{2:{solo:true}}};
assert.equal(Engine.inspect(soloUpper,[]).visual,1);
assert.equal(Engine.inspect(soloUpper,[]).generated,1);
assert.deepEqual(Engine.plan(soloUpper,[]).steps,['repair','detect-beats','qa']);

const legacyHiddenGenerated={...av,trackState:{0:{hidden:false}},trackStates:{0:{hidden:true}}};
assert.equal(Engine.inspect(legacyHiddenGenerated,[]).generated,0);
assert.deepEqual(Engine.plan(legacyHiddenGenerated,[]).steps,['repair','smart-mix','detect-beats','qa']);

console.log('auto-finish-engine regression: ok');
