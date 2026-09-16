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

const shortOutgoing={fps:60,clips:[{id:'a',track:0,sceneText:'a',start:0,duration:.1},{id:'b',track:0,sceneText:'b',start:.1,duration:4}]};
Engine.apply(shortOutgoing);
assert.ok(shortOutgoing.clips[1].transitionDuration<=.1+.0001,'incoming transition must fit the shorter outgoing clip too');
assert.equal((shortOutgoing.clips[1].transitionDuration*60)%1,0,'boundary-limited transition must remain frame aligned');
assert.equal(Engine.inspect(shortOutgoing).invalid,0,'automation must not generate a transition invalid for the outgoing clip');
const invalidOutgoing={fps:60,clips:[{id:'a',track:0,sceneText:'a',start:0,duration:.1},{id:'b',track:0,sceneText:'b',start:.1,duration:4,transition:'fade',transitionDuration:.2,autoTransition:true}]};
assert.equal(Engine.inspect(invalidOutgoing).invalid,1,'QC must reject automatic transitions longer than either adjacent clip');

const lockedClip={fps:30,clips:[
  {id:'a',track:0,sceneText:'a',start:0,duration:2,locked:true,transition:'fade'},
  {id:'b',track:0,sceneText:'b',start:2,duration:2,locked:true,transition:'zoom',transitionDuration:.3,autoTransition:true},
  {id:'c',track:0,sceneText:'c',start:4,duration:2}
]};
const lockedClipBefore=structuredClone(lockedClip.clips);
const lockedClipResult=Engine.apply(lockedClip,{force:true});
assert.deepEqual(lockedClip.clips,lockedClipBefore,'force must not change locked clips or transition boundaries adjacent to them');
assert.equal(lockedClipResult.locked,3,'both locked clips and the protected boundary after them must be skipped');
assert.equal(lockedClip.clips[2].autoTransition,undefined,'an unlocked clip after a locked clip must keep its incoming boundary untouched');
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

const aliases={fps:30,clips:[
  {id:'a',track:'00',sceneText:'a',start:0,duration:2},
  {id:'b',track:'+0.0',sceneText:'b',start:2,duration:2},
  {id:'bad-bool',track:false,sceneText:'bad',start:4,duration:2},
  {id:'bad-empty',track:'',sceneText:'bad',start:6,duration:2},
  {id:'other',track:'V0',sceneText:'other',start:8,duration:2}
]};
const aliasesResult=Engine.apply(aliases);
assert.equal(aliasesResult.generated,2,'numeric aliases of track 0 must be eligible');
assert.equal(aliases.clips[1].autoTransition,true,'canonical track alias must receive automatic transition');
assert.equal(aliases.clips[2].autoTransition,undefined,'boolean false must not alias track 0');
assert.equal(aliases.clips[3].autoTransition,undefined,'empty track must not alias track 0');
assert.equal(aliases.clips[4].autoTransition,undefined,'text track IDs must remain distinct');

for(const [mapName,key] of [['trackState','00'],['trackStates','+0.0']]){
  const aliasLock={fps:30,[mapName]:{[key]:{locked:true}},clips:[
    {id:'a',track:'-0',sceneText:'a',start:0,duration:2},
    {id:'b',track:0,sceneText:'b',start:2,duration:2}
  ]};
  const before=JSON.stringify(aliasLock);
  const result=Engine.apply(aliasLock,{force:true});
  assert.equal(JSON.stringify(aliasLock),before,`${mapName} canonical alias lock must protect track 0`);
  assert.equal(result.locked,2);
  assert.equal(Engine.inspect(aliasLock).locked,2);
}

const importedFalse={fps:30,clips:[
  {id:'a',track:0,sceneText:'a',start:0,duration:2},
  {id:'manual',track:0,name:'PROBLEMA',sceneText:'b',start:2,duration:2,transition:'fade',transitionDuration:.2,autoTransition:'false'},
  {id:'gap',track:0,name:'CTA',sceneText:'c',start:5,duration:2,transition:'zoom',transitionDuration:.25,autoTransition:'false'}
]};
const importedInspection=Engine.inspect(importedFalse);
assert.equal(importedInspection.manual,2,'string false must keep imported transitions classified as manual');
assert.equal(importedInspection.stale,0,'string false must not classify a manual transition across a gap as stale automatic state');
assert.equal(importedInspection.invalid,0,'string false must not enter automatic transition validation');
const importedBefore=structuredClone(importedFalse.clips);
const importedResult=Engine.apply(importedFalse);
assert.equal(importedFalse.clips[1].transition,'fade','manual transition with autoTransition:"false" must be preserved');
assert.equal(importedFalse.clips[1].transitionDuration,.2,'manual transition duration must remain untouched');
assert.equal(importedFalse.clips[1].autoTransition,'false','manual persisted flag must not be rewritten without force');
assert.equal(importedFalse.clips[2].transition,'zoom','manual gapped transition with string false must not be cleared');
assert.equal(importedFalse.clips[2].transitionDuration,.25,'manual gapped transition duration must remain untouched');
assert.equal(importedFalse.clips[2].autoTransition,'false');
assert.equal(importedResult.preserved,1,'eligible imported manual transition must be preserved');
assert.equal(importedResult.cleared,0,'manual transitions must never be cleared as stale automatic transitions');
assert.deepEqual(importedFalse.clips.slice(1),importedBefore.slice(1),'non-forced automation must leave imported manual transitions byte-for-byte unchanged');
assert.equal(Engine.autoTransitionEnabled({autoTransition:true}),true);
assert.equal(Engine.autoTransitionEnabled({autoTransition:'true'}),false);
assert.equal(Engine.autoTransitionEnabled({autoTransition:'false'}),false);

console.log('auto-transition-engine regression: ok');