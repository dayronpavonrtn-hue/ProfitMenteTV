import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const Engine=require('./auto-finish-engine.js');

const base={clips:[],markers:[],trackState:{}};
assert.deepEqual(Engine.plan(base,[]).steps,['repair','qa']);

const av={...base,clips:[
  {id:'v1',track:0,asset:'img',sceneText:'a'},
  {id:'v2',track:0,asset:'img',sceneText:'b'},
  {id:'m',track:5,asset:'music'},
  {id:'vo',track:6,asset:'voice'}
]};
assert.deepEqual(Engine.plan(av,[]).steps,['repair','smart-mix','detect-beats','sync-beats','qa']);

const withBeats={...av,markers:[{time:1,label:'Beat 1'}]};
assert.deepEqual(Engine.plan(withBeats,[]).steps,['repair','smart-mix','sync-beats','qa']);

const mutedMusic={...av,trackState:{5:{muted:true}}};
assert.deepEqual(Engine.plan(mutedMusic,[]).steps,['repair','detect-beats','sync-beats','qa']);

const manual={...base,clips:[{track:0,asset:'v'},{track:5,asset:'m'}]};
assert.deepEqual(Engine.plan(manual,[]).steps,['repair','detect-beats','qa']);

console.log('auto-finish-engine regression: ok');
