import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Engine = require('./audio-normalize-engine.js');

assert.equal(Engine.hasAsset(0), true, 'numeric media id 0 must remain valid');
assert.equal(Engine.hasAsset(' 0 '), true, 'string media id 0 must remain valid');
assert.equal(Engine.hasAsset('   '), false, 'blank media references must stay invalid');
assert.equal(Engine.canonicalMediaId(' 07 '), '7', 'legacy numeric media ids should canonicalize');

const assets = [
  { id: 0, type: 'audio' },
  { id: 7, type: 'audio' },
  { id: 'voice-A', type: 'audio' },
];
assert.equal(Engine.findAsset(assets, ' 0 ')?.id, 0, 'numeric zero must resolve across legacy string identity');
assert.equal(Engine.findAsset(assets, '07')?.id, 7, 'numeric aliases must resolve to the same asset');
assert.equal(Engine.findAsset(assets, ' voice-A ')?.id, 'voice-A', 'text ids should ignore accidental surrounding spaces');
assert.equal(Engine.findAsset(assets, ''), null, 'blank ids must never match an asset');

const project = {
  trackState: {
    '05': { muted: true },
    '6.0': { solo: true },
    bad: { solo: true },
  },
  clips: [
    { id: 'voice', track: '04', asset: 0 },
    { id: 'music', track: '5.0', asset: '7' },
    { id: 'sfx', track: '06', asset: 'voice-A' },
    { id: 'blank', track: 6, asset: '   ' },
  ],
};

assert.equal(Engine.trackState(project, 5).muted, true, 'legacy 05 track state must apply to music');
assert.equal(Engine.trackState(project, 6).solo, true, 'legacy 6.0 track state must apply to effects');
assert.equal(Engine.trackState(project, 4).solo, undefined, 'invalid aliases must not contaminate valid tracks');
assert.equal(Engine.trackActive(project, '05'), false, 'legacy muted alias must disable its track');
assert.equal(Engine.trackActive(project, '6.0'), true, 'legacy solo alias must activate its track');
assert.equal(Engine.trackActive(project, '04'), false, 'solo on another audio track must suppress non-solo tracks');

const active = Engine.activeAudioClips(project).map(clip => clip.id);
assert.deepEqual(active, ['sfx'], 'normalization must honor solo/mute state and ignore blank assets while preserving valid identities');

const zeroProject = { clips: [{ id: 'zero', track: 4, asset: 0 }] };
assert.deepEqual(Engine.activeAudioClips(zeroProject).map(clip => clip.id), ['zero'], 'asset id 0 must be eligible for normalization');

console.log('ProfitMente Studio audio normalization identity QA: PASS');
