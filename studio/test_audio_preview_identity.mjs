import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { ProfitMenteAudioEngine } = require('./audio-engine.js');

const engine = new ProfitMenteAudioEngine();

assert.equal(engine.canonicalMediaId(0), '0');
assert.equal(engine.canonicalMediaId('0'), '0');
assert.equal(engine.canonicalMediaId(' 7 '), '7');
assert.equal(engine.canonicalMediaId(7), '7');
assert.equal(engine.canonicalMediaId(''), null);
assert.equal(engine.canonicalMediaId('   '), null);
assert.equal(engine.mediaAssigned(0), true);
assert.equal(engine.mediaAssigned(' 0 '), true);
assert.equal(engine.mediaAssigned(''), false);
assert.equal(engine.mediaAssigned(null), false);

const assets = [
  { id: 0, type: 'audio', name: 'zero.wav' },
  { id: 7, type: 'audio', name: 'seven.wav' },
  { id: 'hero', type: 'video', name: 'hero.mp4' },
];
assert.equal(engine.findAsset(assets, '0')?.name, 'zero.wav');
assert.equal(engine.findAsset(assets, ' 7 ')?.name, 'seven.wav');
assert.equal(engine.findAsset(assets, 'hero')?.name, 'hero.mp4');
assert.equal(engine.findAsset(assets, ''), null);

assert.equal(engine.canonicalTrack('00'), 0);
assert.equal(engine.canonicalTrack('1.0'), 1);
assert.equal(engine.canonicalTrack('06'), 6);
assert.equal(engine.canonicalTrack('1.5'), null);
assert.equal(engine.canonicalTrack(7), null);

const legacyProject = {
  trackStates: {
    '04': { gain: 0.4 },
    '05.0': { gain: 0.25 },
    '00': { hidden: true },
  },
};
assert.equal(engine.trackGainValue(legacyProject, 4), 0.4);
assert.equal(engine.trackGainValue(legacyProject, '5'), 0.25);
assert.equal(engine.visualTrackHidden(legacyProject, 0), true);
assert.equal(engine.visualTrackHidden(legacyProject, '0.0'), true);

const modernProject = {
  trackState: {
    4: { gain: 1.7 },
    1: { hidden: true },
  },
  trackStates: {
    '04': { gain: 0.2 },
    '01': { hidden: false },
  },
};
assert.equal(engine.trackGainValue(modernProject, 4), 1.7, 'trackState should win over legacy trackStates');
assert.equal(engine.visualTrackHidden(modernProject, 1), true, 'modern hidden state should win over legacy alias');

assert.equal(engine.trackGainValue({ trackStates: { '04': { gain: 9 } } }, 4), 2, 'gain must remain clamped');
assert.equal(engine.trackGainValue({ trackStates: { '04': { gain: -3 } } }, 4), 0, 'gain must remain clamped');

console.log('audio preview identity regression: PASS');
