import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);const Engine=require('./media-replace-engine.js');
const near=(actual,expected,eps=1e-9)=>assert.ok(Math.abs(actual-expected)<=eps,`expected ${actual} ≈ ${expected}`);

const baseClip={id:'c1',track:0,asset:'old',name:'Old',start:2,duration:6,sourceOffset:2,speed:1.5,scale:1.2,x:10,y:-4,rotation:3,transition:'fade',fadeIn:.4,fadeOut:.4,keyframes:{start:{scale:1},end:{scale:1.3}}};
const project={clips:[structuredClone(baseClip)]};
let r=Engine.replace(project,'c1',{id:'new-video',name:'New video',type:'video',duration:7});
assert.equal(r.ok,true);assert.equal(project.clips[0].asset,'new-video');assert.equal(project.clips[0].name,'New video');assert.equal(project.clips[0].scale,1.2);assert.equal(project.clips[0].transition,'fade');assert.deepEqual(project.clips[0].keyframes,baseClip.keyframes);assert.equal(project.clips[0].sourceOffset,2);near(project.clips[0].duration,(7-2)/1.5);assert.equal(r.trimmed,true);

const visual={clips:[{id:'v',track:1,asset:'x',duration:4,sourceOffset:3,speed:2,fadeIn:.5,fadeOut:.5}]};
r=Engine.replace(visual,'v',{id:'img',name:'Still',type:'image',duration:5});assert.equal(r.ok,true);assert.equal(visual.clips[0].sourceOffset,0);assert.equal(visual.clips[0].duration,4);

const audio={clips:[{id:'a',track:5,asset:'x',duration:8,sourceOffset:1,speed:1,volume:.7}]};
r=Engine.replace(audio,'a',{id:'voice',name:'Voice',type:'audio',duration:4});assert.equal(r.ok,true);assert.equal(audio.clips[0].duration,3);assert.equal(audio.clips[0].volume,.7);

const tooShort={clips:[{id:'short',track:0,asset:'old',name:'Old short target',duration:2,sourceOffset:0,speed:1,fadeIn:.1,fadeOut:.1}]};
const tooShortBefore=structuredClone(tooShort);
r=Engine.replace(tooShort,'short',{id:'tiny',name:'Tiny video',type:'video',duration:.2});
assert.equal(r.ok,false);assert.equal(r.reason,'source-too-short');near(r.available,.2);assert.equal(r.required,.25);assert.deepEqual(tooShort,tooShortBefore);

const speedMakesShort={clips:[{id:'fast',track:5,asset:'old',duration:2,sourceOffset:0,speed:2,volume:.8}]};
const speedMakesShortBefore=structuredClone(speedMakesShort);
r=Engine.replace(speedMakesShort,'fast',{id:'tiny-audio',name:'Tiny audio',type:'audio',duration:.4});
assert.equal(r.ok,false);assert.equal(r.reason,'source-too-short');near(r.available,.2);assert.deepEqual(speedMakesShort,speedMakesShortBefore);

const minimumBoundary={clips:[{id:'minimum',track:0,asset:'old',duration:2,sourceOffset:0,speed:1,fadeIn:.5,fadeOut:.5}]};
r=Engine.replace(minimumBoundary,'minimum',{id:'quarter',name:'Quarter second',type:'video',duration:.25});
assert.equal(r.ok,true);near(minimumBoundary.clips[0].duration,.25);near(minimumBoundary.clips[0].fadeIn,.25);near(minimumBoundary.clips[0].fadeOut,.25);

const unknownDuration={clips:[{id:'unknown',track:0,asset:'old',duration:2,sourceOffset:1,speed:1}]};
r=Engine.replace(unknownDuration,'unknown',{id:'unknown-video',name:'Metadata pending',type:'video'});
assert.equal(r.ok,true);assert.equal(unknownDuration.clips[0].duration,2);assert.equal(unknownDuration.clips[0].sourceOffset,1);

const invalidLegacyDuration={clips:[{id:'legacy-invalid',track:0,asset:'old',duration:'oops',sourceOffset:0,speed:1,fadeIn:2,fadeOut:2}]};
r=Engine.replace(invalidLegacyDuration,'legacy-invalid',{id:'valid-video',name:'Valid video',type:'video',duration:10});
assert.equal(r.ok,true);near(invalidLegacyDuration.clips[0].duration,.25);near(invalidLegacyDuration.clips[0].fadeIn,.25);near(invalidLegacyDuration.clips[0].fadeOut,.25);

const zeroLegacyDuration={clips:[{id:'legacy-zero',track:1,asset:'old',duration:0,sourceOffset:4,speed:1}]};
r=Engine.replace(zeroLegacyDuration,'legacy-zero',{id:'still',name:'Still',type:'image'});
assert.equal(r.ok,true);near(zeroLegacyDuration.clips[0].duration,.25);assert.equal(zeroLegacyDuration.clips[0].sourceOffset,0);

const incompatible={clips:[{id:'x',track:5,asset:'a',duration:2}]};r=Engine.replace(incompatible,'x',{id:'pic',name:'Pic',type:'image',duration:5});assert.equal(r.ok,false);assert.equal(r.reason,'incompatible');assert.equal(incompatible.clips[0].asset,'a');

const lockedClip={clips:[{...structuredClone(baseClip),id:'locked-clip',locked:true}]};
const lockedClipBefore=structuredClone(lockedClip);
r=Engine.replace(lockedClip,'locked-clip',{id:'replacement',name:'Replacement',type:'video',duration:20});
assert.equal(r.ok,false);assert.equal(r.reason,'locked');assert.deepEqual(lockedClip,lockedClipBefore);

const lockedTrack={clips:[{...structuredClone(baseClip),id:'locked-track',track:1}],trackState:{1:{locked:true}}};
const lockedTrackBefore=structuredClone(lockedTrack);
r=Engine.replace(lockedTrack,'locked-track',{id:'replacement',name:'Replacement',type:'image',duration:20});
assert.equal(r.ok,false);assert.equal(r.reason,'locked');assert.deepEqual(lockedTrack,lockedTrackBefore);

const lockedTrackLegacy={clips:[{...structuredClone(baseClip),id:'locked-track-legacy',track:0}],trackStates:{'0':{locked:true}}};
const lockedTrackLegacyBefore=structuredClone(lockedTrackLegacy);
r=Engine.replace(lockedTrackLegacy,'locked-track-legacy',{id:'replacement',name:'Replacement',type:'video',duration:20});
assert.equal(r.ok,false);assert.equal(r.reason,'locked');assert.deepEqual(lockedTrackLegacy,lockedTrackLegacyBefore);

const mixedTrackMaps={clips:[{...structuredClone(baseClip),id:'mixed-maps',track:1}],trackState:{0:{locked:false}},trackStates:{'1':{locked:true}}};
const mixedTrackMapsBefore=structuredClone(mixedTrackMaps);
r=Engine.replace(mixedTrackMaps,'mixed-maps',{id:'replacement',name:'Replacement',type:'video',duration:20});
assert.equal(r.ok,false);assert.equal(r.reason,'locked');assert.deepEqual(mixedTrackMaps,mixedTrackMapsBefore);

const conflictingSameTrackMaps={clips:[{...structuredClone(baseClip),id:'same-track-conflict',track:1}],trackState:{1:{locked:false}},trackStates:{'1':{locked:true}}};
const conflictingSameTrackMapsBefore=structuredClone(conflictingSameTrackMaps);
r=Engine.replace(conflictingSameTrackMaps,'same-track-conflict',{id:'replacement',name:'Replacement',type:'video',duration:20});
assert.equal(r.ok,false);assert.equal(r.reason,'locked');assert.deepEqual(conflictingSameTrackMaps,conflictingSameTrackMapsBefore);

assert.equal(Engine.replace({clips:[]},'missing',{id:'a',type:'audio'}).reason,'clip-missing');

const legacyIds={clips:[{id:'007',track:0,asset:'old',duration:2,sourceOffset:0,speed:1}]};
r=Engine.replace(legacyIds,'+07.000',{id:0,name:'Zero ID image',type:'image'});
assert.equal(r.ok,true);assert.equal(legacyIds.clips[0].asset,0);assert.equal(Engine.findClip(legacyIds,7),legacyIds.clips[0]);
assert.equal(Engine.sameId('007',7),true);assert.equal(Engine.sameId('+07.000',7),true);assert.equal(Engine.sameId('-0',0),true);
assert.equal(Engine.sameId('ClipA','clipa'),false);assert.equal(Engine.sameId(true,1),false);
const legacyAssets=[{id:'007',name:'Legacy'},{id:'ClipA',name:'Text'}];
assert.equal(Engine.findAsset(legacyAssets,7),legacyAssets[0]);assert.equal(Engine.findAsset(legacyAssets,'clipa'),null);
assert.equal(Engine.replace({clips:[{id:1,track:0,duration:1}]},1,{id:true,type:'image'}).reason,'asset-missing');

console.log('media replace engine ok');
