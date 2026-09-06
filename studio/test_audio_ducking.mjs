import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),Ducking=require('./audio-ducking-engine.js');

const music={id:'m1',track:5,asset:'music',start:0,duration:12,sourceOffset:1,speed:1.5,volume:.30,duckVolume:.10,fadeIn:.4,fadeOut:.6};
const project={clips:[music,{id:'v1',track:6,asset:'voice1',start:2,duration:2},{id:'v2',track:6,asset:'voice2',start:3.5,duration:2},{id:'v3',track:6,asset:'voice3',start:8,duration:1}]};
assert.deepEqual(Ducking.intervals(project,music),[{start:2,end:5.5},{start:8,end:9}]);
assert.ok(Math.abs(Ducking.multiplier(music)-1/3)<1e-9);assert.equal(Ducking.multiplierAt(project,music,1),1);assert.ok(Math.abs(Ducking.multiplierAt(project,music,3)-1/3)<1e-9);assert.equal(Ducking.multiplierAt(project,music,6),1);
const events=Ducking.events(project,music,0,12);assert.deepEqual(events.map(x=>x.time),[2,5.5,8,9]);
const render=Ducking.prepareForRender(project),parts=render.clips.filter(c=>c.track===5);
assert.deepEqual(parts.map(c=>[c.start,c.duration,c.volume]),[[0,2,.3],[2,3.5,.1],[5.5,2.5,.3],[8,1,.1],[9,3,.3]]);
assert.equal(parts[0].sourceOffset,1);assert.ok(Math.abs(parts[1].sourceOffset-4)<1e-9);assert.equal(parts[0].fadeIn,.4);assert.equal(parts[0].fadeOut,0);assert.equal(parts.at(-1).fadeIn,0);assert.equal(parts.at(-1).fadeOut,.6);
assert.equal(project.clips.length,4,'prepareForRender must not mutate editor project');
const muted={...project,trackState:{6:{muted:true}}};assert.deepEqual(Ducking.intervals(muted,music),[]);

// Persisted legacy mute must remain conservative when current state disagrees.
const legacyMuted={...project,trackState:{6:{muted:false}},trackStates:{6:{muted:true}}};
assert.deepEqual(Ducking.intervals(legacyMuted,music),[]);
assert.equal(Ducking.prepareForRender(legacyMuted).clips.filter(c=>c.track===5).length,1);

// Audio Solo is semantic across tracks 4-6, matching the canonical render path.
// Solo music makes voice inactive, so inactive voice must not duck it.
const soloMusic={...project,trackState:{5:{solo:true}}};
assert.deepEqual(Ducking.intervals(soloMusic,music),[]);
assert.equal(Ducking.prepareForRender(soloMusic).clips.filter(c=>c.track===5).length,1);

// Solo voice makes music inactive. Ducking must not manufacture segmented copies
// of a track that the render path will mute.
const soloVoice={...project,trackState:{6:{solo:true}}};
assert.deepEqual(Ducking.intervals(soloVoice,music),[]);
assert.equal(Ducking.prepareForRender(soloVoice).clips.filter(c=>c.track===5).length,1);

// A legacy Solo flag is equally authoritative, and mixed current/legacy state
// cannot silently re-enable a track.
const legacySoloVoice={...project,trackState:{6:{solo:false}},trackStates:{6:{solo:true}}};
assert.deepEqual(Ducking.intervals(legacySoloVoice,music),[]);
const legacySoloMusic={...project,trackState:{5:{solo:false}},trackStates:{5:{solo:true}}};
assert.deepEqual(Ducking.intervals(legacySoloMusic,music),[]);

// Solo on another audio layer (track 4) deactivates both music and voice.
const soloSourceAudio={...project,trackState:{4:{solo:true}}};
assert.deepEqual(Ducking.intervals(soloSourceAudio,music),[]);

// Canonical aliases from older projects must behave exactly like tracks 5/6.
const aliasMusic={...music,track:'05'};
const aliasProject={clips:[aliasMusic,{id:'legacy-v',track:'6.0',asset:'voice',start:1,duration:2}]};
assert.deepEqual(Ducking.intervals(aliasProject,aliasMusic),[{start:1,end:3}]);
assert.equal(Ducking.prepareForRender(aliasProject).clips.filter(c=>Ducking.canonicalTrack(c.track)===5).length,3);

// Legacy state maps may store aliases instead of canonical numeric keys.
const aliasMuted={...aliasProject,trackStates:{'06':{muted:true}}};
assert.deepEqual(Ducking.intervals(aliasMuted,aliasMusic),[]);
const aliasSolo={...aliasProject,trackState:{'5.0':{solo:true}}};
assert.deepEqual(Ducking.intervals(aliasSolo,aliasMusic),[]);

// Numeric media id 0 is a valid reference and must never be treated as empty.
const zeroMusic={...music,id:'m0',asset:0};
const zeroProject={clips:[zeroMusic,{id:'v0',track:6,asset:0,start:2,duration:2}]};
assert.deepEqual(Ducking.intervals(zeroProject,zeroMusic),[{start:2,end:4}]);
const zeroRender=Ducking.prepareForRender(zeroProject),zeroParts=zeroRender.clips.filter(c=>c.id.startsWith('m0-duck-'));
assert.equal(zeroParts.length,3);
assert.deepEqual(zeroParts.map(c=>c.volume),[.3,.1,.3]);
assert.equal(zeroProject.clips.length,2,'zero-id render preparation must remain immutable');

// Empty assets and invalid track aliases must not create phantom ducking.
assert.deepEqual(Ducking.intervals({clips:[music,{track:6,asset:'',start:2,duration:2}]},music),[]);
assert.deepEqual(Ducking.intervals({clips:[music,{track:'6.5',asset:'voice',start:2,duration:2}]},music),[]);
assert.deepEqual(Ducking.intervals({clips:[music,{track:7,asset:'voice',start:2,duration:2}]},music),[]);
assert.equal(Ducking.canonicalTrack(''),null);
assert.equal(Ducking.canonicalTrack('6.5'),null);
assert.equal(Ducking.canonicalTrack(7),null);

// Boolean values must not collapse into numeric track/media identities.
assert.equal(Ducking.canonicalTrack(false),null);
assert.equal(Ducking.canonicalTrack(true),null);
assert.equal(Ducking.hasAsset(false),false);
assert.equal(Ducking.hasAsset(true),false);
assert.deepEqual(Ducking.intervals({clips:[music,{track:false,asset:'voice',start:2,duration:2}]},music),[]);
assert.deepEqual(Ducking.intervals({clips:[music,{track:6,asset:false,start:2,duration:2}]},music),[]);
assert.deepEqual(Ducking.intervals({clips:[{...music,asset:false},{track:6,asset:'voice',start:2,duration:2}]},{...music,asset:false}),[]);

const noVoice={clips:[music]};assert.equal(Ducking.prepareForRender(noVoice).clips.length,1);
console.log('audio ducking ok');
