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
const noVoice={clips:[music]};assert.equal(Ducking.prepareForRender(noVoice).clips.length,1);
console.log('audio ducking ok');
