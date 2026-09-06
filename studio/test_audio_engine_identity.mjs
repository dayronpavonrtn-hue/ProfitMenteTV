import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const {ProfitMenteAudioEngine}=require('./audio-engine.js');

const engine=new ProfitMenteAudioEngine();

assert.equal(engine.canonicalTrack(0),0);
assert.equal(engine.canonicalTrack('00'),0);
assert.equal(engine.canonicalTrack('+05.0'),5);
assert.equal(engine.canonicalTrack('-0'),0);
assert.equal(engine.canonicalTrack(false),null);
assert.equal(engine.canonicalTrack(true),null);
assert.equal(engine.canonicalTrack(''),null);
assert.equal(engine.canonicalTrack('1.5'),null);
assert.equal(engine.canonicalTrack(7),null);

assert.equal(engine.canonicalMediaId(0),'0');
assert.equal(engine.canonicalMediaId(-0),'0');
assert.equal(engine.canonicalMediaId('007'),'7');
assert.equal(engine.canonicalMediaId('+07.000'),'7');
assert.equal(engine.canonicalMediaId(false),null);
assert.equal(engine.canonicalMediaId(true),null);
assert.equal(engine.canonicalMediaId({id:7}),null);
assert.equal(engine.canonicalMediaId('ClipA'),'ClipA');
assert.notEqual(engine.canonicalMediaId('ClipA'),engine.canonicalMediaId('clipa'));

const assets=[{id:'007',type:'audio'},{id:'ClipA',type:'video'}];
assert.equal(engine.findAsset(assets,7),assets[0]);
assert.equal(engine.findAsset(assets,'+07.0'),assets[0]);
assert.equal(engine.findAsset(assets,'clipa'),null);
assert.equal(engine.findAsset(assets,false),null);

const project={trackState:{'05':{gain:.4}},trackStates:{'+00.0':{hidden:true}}};
assert.equal(engine.trackGainValue(project,5),.4);
assert.equal(engine.visualTrackHidden(project,0),true);
assert.deepEqual(engine.trackStateValue(project,false),{});

const events=[];
engine.ducking={
 multiplierAt(){return .25},
 events(){return [{time:2,value:.5}]}
};
const node={gain:{cancelScheduledValues(){},setValueAtTime(value,time){events.push([value,time])}}};
engine.scheduleDucking({}, {track:'05'}, node, 10, 1, 3);
assert.deepEqual(events,[[.25,10],[.5,11]]);

events.length=0;
engine.scheduleDucking({}, {track:false}, node, 10, 1, 3);
assert.deepEqual(events,[[1,10]]);

console.log('audio engine identity regressions: ok');
