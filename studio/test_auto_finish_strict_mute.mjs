import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const Engine=require('./auto-finish-engine.js');

const base={markers:[],trackState:{},clips:[
  {id:'v1',track:0,asset:'img',sceneText:'a',autoTransition:'false'},
  {id:'v2',track:0,asset:'img',sceneText:'b',autoTransition:false},
  {id:'m',track:5,asset:'music',muted:'false'},
  {id:'vo',track:6,asset:'voice',muted:false},
  {id:'fx',track:4,asset:'hit',muted:0}
]};

const state=Engine.inspect(base,[]);
assert.equal(state.music,1,'muted:"false" no debe silenciar música');
assert.equal(state.voice,1,'muted:false debe mantener voz activa');
assert.equal(state.sfx,1,'valores no booleanos no deben silenciar SFX');
assert.equal(state.autoTransitions,0,'autoTransition:"false" no debe contar como transición automática completada');
assert.ok(Engine.plan(base,[]).steps.includes('smart-mix'),'Auto Finish debe conservar smart-mix cuando voz y música siguen activas');
assert.ok(Engine.plan(base,[]).steps.includes('audio-headroom'),'Auto Finish debe conservar QA/headroom de audio');
assert.ok(Engine.plan(base,[]).steps.includes('auto-transitions'),'Auto Finish debe seguir planificando transiciones cuando flags importados no son true');

const trulyMuted={...base,clips:base.clips.map(c=>c.id==='m'?{...c,muted:true}:c)};
const mutedState=Engine.inspect(trulyMuted,[]);
assert.equal(mutedState.music,0,'solo muted:true debe silenciar el clip');
assert.equal(mutedState.voice,1);
assert.ok(!Engine.plan(trulyMuted,[]).steps.includes('smart-mix'),'sin música activa no debe planear smart-mix');

const trulyTransitioned={...base,clips:base.clips.map(c=>c.id==='v1'?{...c,autoTransition:true}:c)};
assert.equal(Engine.inspect(trulyTransitioned,[]).autoTransitions,1,'solo autoTransition:true debe contar como transición automática');

console.log('auto-finish strict persisted flags regression: ok');
