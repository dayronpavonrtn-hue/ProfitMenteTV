import assert from 'node:assert/strict';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const {ProfitMenteAudioEngine}=require('./audio-engine.js');
const engine=new ProfitMenteAudioEngine();

assert.equal(engine.strictFlag(true),true);
for(const value of [false,'true','false',1,0,null,undefined,{},[]])assert.equal(engine.strictFlag(value),false);

const corrupt={trackState:{'5':{muted:'false'},'0':{hidden:'true'}}};
assert.equal(engine.audioTrackMuted(corrupt,5),false,'string false must not mute Music');
assert.equal(engine.visualTrackHidden(corrupt,0),false,'string true must not hide Video');

const direct={trackState:{'5':{muted:true},'0':{hidden:true}}};
assert.equal(engine.audioTrackMuted(direct,5),true,'boolean true must mute Music');
assert.equal(engine.visualTrackHidden(direct,0),true,'boolean true must hide Video');

const aliases={trackState:{'05':{muted:true},'5':{muted:false,gain:.4},'00':{hidden:true},'0':{hidden:false}}};
assert.equal(engine.audioTrackMuted(aliases,5),true,'a true legacy alias must not be bypassed by canonical false');
assert.equal(engine.visualTrackHidden(aliases,0),true,'a true visual alias must remain protective');
assert.equal(engine.trackGainValue(aliases,5),.4,'canonical ordinary values should remain authoritative');

const legacyAndCurrent={trackStates:{'5':{muted:true},'0':{hidden:true}},trackState:{'5':{muted:false},'0':{hidden:false}}};
assert.equal(engine.audioTrackMuted(legacyAndCurrent,5),true,'legacy true mute must survive current-map merge');
assert.equal(engine.visualTrackHidden(legacyAndCurrent,0),true,'legacy true hidden must survive current-map merge');

const audioSolo={trackState:{'5':{solo:true},'4':{solo:false},'6':{solo:'true'}}};
assert.equal(engine.audioTrackMuted(audioSolo,5),false,'solo Music must stay audible');
assert.equal(engine.audioTrackMuted(audioSolo,4),true,'non-solo SFX must mute while an audio Solo is active');
assert.equal(engine.audioTrackMuted(audioSolo,6),true,'string solo must not opt Voice into Solo');

const visualSolo={trackState:{'1':{solo:true},'0':{solo:false}}};
assert.equal(engine.visualTrackHidden(visualSolo,1),false,'solo Overlay must stay visible');
assert.equal(engine.visualTrackHidden(visualSolo,0),true,'non-solo Video must hide while a visual Solo is active');

console.log('ProfitMente preview audio track-state parity regression: OK');
