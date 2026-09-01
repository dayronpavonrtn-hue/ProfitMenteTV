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

const lockedClip={fps:30,clips:[
  {id:'a',track:0,sceneText:'a',start:0,duration:2,locked:true,transition:'fade'},
  {id:'b',track:0,sceneText:'b',start:2,duration:2,locked:true,transition:'zoom',transitionDuration:.3,autoTransition:true},
  {id:'c',track:0,sceneText:'c',start:4,duration:2}
]};
const lockedClipBefore=structuredClone(lockedClip.clips.slice(0,2));
const lockedClipResult=Engine.apply(lockedClip,{force:true});
assert.deepEqual(lockedClip.clips.slice(0,2),lockedClipBefore,'force must never change individually locked clips');
assert.equal(lockedClipResult.locked,2);
assert.equal(lockedClip.clips[2].autoTransition,true,'unlocked generated clips must remain eligible');
assert.equal(Engine.inspect(lockedClip).locked,2);

for(const mapName of ['trackState','trackStates']){
  const lockedTrack={fps:30,[mapName]:{0:{locked:true}},clips:[
    {id:'a',track:0,sceneText:'a',start:0,duration:2},
    {id:'b',track:0,sceneText:'b',start:2,duration:2,transition:'fade',transitionDuration:.2,autoTransition:true}
  ]};
  const before=JSON.stringify(lockedTrack);
  const result=Engine.apply(lockedTrack,{force:true});
  assert.equal(JSON.stringify(lockedTrack),before,`${mapName} lock must make automatic transitions atomic and read-only`);
  assert.equal(result.changed,0);
  assert.equal(result.locked,2);
  assert.equal(Engine.inspect(lockedTrack).locked,2,`${mapName} lock must be visible to automation inspection`);
}

const conflictingMaps={fps:30,trackState:{0:{locked:false}},trackStates:{0:{locked:true}},clips:[
  {id:'a',track:0,sceneText:'a',start:0,duration:2},
  {id:'b',track:0,sceneText:'b',start:2,duration:2}
]};
const conflictBefore=JSON.stringify(conflictingMaps);
const conflictResult=Engine.apply(conflictingMaps,{force:true});
assert.equal(JSON.stringify(conflictingMaps),conflictBefore,'a legacy lock must win over an unlocked current map');
assert.equal(conflictResult.locked,2);
assert.equal(Engine.inspect(conflictingMaps).locked,2,'inspection must treat either lock map as authoritative');

console.log('auto-transition-engine regression: ok');