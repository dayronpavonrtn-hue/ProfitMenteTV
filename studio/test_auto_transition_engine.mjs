import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {ProfitMenteAutoTransitionEngine:Engine}=require('./auto-transition-engine.js');

const project={fps:24,clips:[
  {id:'a',track:0,name:'HOOK',sceneText:'a',start:0,duration:4,transition:'fade'},
  {id:'b',track:0,name:'PROBLEMA',sceneText:'b',start:4,duration:4},
  {id:'c',track:0,name:'SOLUCIÓN',sceneText:'c',start:8,duration:4,transition:'zoom'},
  {id:'d',track:0,name:'CTA',sceneText:'d',start:13,duration:3,transition:'fade',transitionDuration:.25,autoTransition:true},
  {id:'manual',track:0,name:'Manual',start:16,duration:2,transition:'slide'}
]};
const r=Engine.apply(project);
assert.equal(project.clips[0].transition,'fade','manual first transition must be preserved');
assert.equal(project.clips[1].transition,'slide');
assert.equal(project.clips[1].autoTransition,true);
assert.equal(project.clips[2].transition,'zoom','manual generated transition must be preserved');
assert.equal(project.clips[2].autoTransition,undefined);
assert.equal(project.clips[3].transition,'cut','stale automatic transition across a gap must be cleared');
assert.equal(project.clips[3].transitionDuration,undefined);
assert.equal(project.clips[4].transition,'slide','manual clip must never be touched');
assert.equal(r.preserved,1,'only non-first generated manual transitions are counted');assert.equal(r.cleared,1);
assert.equal((project.clips[1].transitionDuration*24)%1,0,'transition duration must align to project frames');
assert.equal(Engine.inspect(project).stale,0);

const forced=structuredClone(project);Engine.apply(forced,{force:true});
assert.equal(forced.clips[0].transition,'cut');
assert.equal(forced.clips[0].autoTransition,true);
assert.equal(forced.clips[2].autoTransition,true);
assert.equal(forced.clips[3].transition,'cut','force must not bridge timeline gaps');

const short={fps:60,clips:[{id:'a',track:0,sceneText:'a',start:0,duration:.2},{id:'b',track:0,sceneText:'b',start:.2,duration:.2}]};
Engine.apply(short);assert.ok(short.clips[1].transitionDuration<=.2+.0001);assert.equal((short.clips[1].transitionDuration*60)%1,0);
assert.equal(Engine.inspect(short).invalid,0);
console.log('auto-transition-engine regression: ok');