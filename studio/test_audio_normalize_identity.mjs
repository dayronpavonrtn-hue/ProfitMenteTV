import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Engine = require('./audio-normalize-engine.js');

assert.equal(Engine.hasAsset(0), true, 'numeric media id 0 must remain valid');
assert.equal(Engine.hasAsset(-0), true, 'negative zero media id must remain valid');
assert.equal(Engine.hasAsset(' 0 '), true, 'string media id 0 must remain valid');
assert.equal(Engine.hasAsset('   '), false, 'blank media references must stay invalid');
assert.equal(Engine.hasAsset(false), false, 'boolean false must never become media id 0');
assert.equal(Engine.hasAsset(true), false, 'boolean true must never become media id 1');
assert.equal(Engine.hasAsset({ id: 7 }), false, 'objects must not be stringified into accidental media ids');
assert.equal(Engine.canonicalMediaId(' 07 '), '7', 'legacy numeric media ids should canonicalize');
assert.equal(Engine.canonicalMediaId('+07.000'), '7', 'signed legacy numeric media ids should canonicalize');
assert.equal(Engine.canonicalMediaId('-0'), '0', 'negative zero aliases should canonicalize to zero');
assert.equal(Engine.canonicalMediaId('Voice-A'), 'Voice-A', 'text media ids must preserve case');
assert.notEqual(Engine.canonicalMediaId('Voice-A'), Engine.canonicalMediaId('voice-A'), 'text media ids must remain case-sensitive');

assert.equal(Engine.canonicalTrack(false), null, 'boolean false must never become track 0');
assert.equal(Engine.canonicalTrack(true), null, 'boolean true must never become track 1');
assert.equal(Engine.canonicalTrack(''), null, 'blank tracks must stay invalid');
assert.equal(Engine.canonicalTrack('   '), null, 'whitespace-only tracks must stay invalid');
assert.equal(Engine.canonicalTrack('-0'), 0, 'negative zero track aliases should map to track 0');
assert.equal(Engine.canonicalTrack('+04.0'), 4, 'legacy signed track aliases should canonicalize');
assert.equal(Engine.canonicalTrack('4.5'), null, 'fractional tracks must stay invalid');
assert.equal(Engine.canonicalTrack(7), null, 'out-of-range tracks must stay invalid');

const assets = [
  { id: 0, type: 'audio' },
  { id: 7, type: 'audio' },
  { id: 'voice-A', type: 'audio' },
];
assert.equal(Engine.findAsset(assets, ' 0 ')?.id, 0, 'numeric zero must resolve across legacy string identity');
assert.equal(Engine.findAsset(assets, '07')?.id, 7, 'numeric aliases must resolve to the same asset');
assert.equal(Engine.findAsset(assets, '+07.000')?.id, 7, 'signed numeric aliases must resolve to the same asset');
assert.equal(Engine.findAsset(assets, ' voice-A ')?.id, 'voice-A', 'text ids should ignore accidental surrounding spaces');
assert.equal(Engine.findAsset(assets, ''), null, 'blank ids must never match an asset');
assert.equal(Engine.findAsset(assets, false), null, 'boolean false must not resolve asset 0');
assert.equal(Engine.findAsset(assets, true), null, 'boolean true must not resolve asset 1');

const clipsById=[{id:0},{id:7},{id:'voice-A'}];
assert.equal(Engine.findClip(clipsById,' 0 ')?.id,0,'selected clip id 0 must survive string/number identity differences');
assert.equal(Engine.findClip(clipsById,'07')?.id,7,'selected numeric clip aliases must resolve canonically');
assert.equal(Engine.findClip(clipsById,'+07.000')?.id,7,'selected signed numeric clip aliases must resolve canonically');
assert.equal(Engine.findClip(clipsById,' voice-A ')?.id,'voice-A','selected text clip ids should ignore surrounding whitespace');
assert.equal(Engine.findClip(clipsById,''),null,'blank selected ids must not resolve a clip');
assert.equal(Engine.findClip(clipsById,false),null,'boolean false must not resolve clip id 0');

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
    { id: 'bool-track', track: false, asset: 0 },
    { id: 'bool-asset', track: 6, asset: false },
  ],
};

assert.equal(Engine.trackState(project, 5).muted, true, 'legacy 05 track state must apply to music');
assert.equal(Engine.trackState(project, 6).solo, true, 'legacy 6.0 track state must apply to effects');
assert.equal(Engine.trackState(project, 4).solo, undefined, 'invalid aliases must not contaminate valid tracks');
assert.equal(Engine.trackActive(project, '05'), false, 'legacy muted alias must disable its track');
assert.equal(Engine.trackActive(project, '6.0'), true, 'legacy solo alias must activate its track');
assert.equal(Engine.trackActive(project, '04'), false, 'solo on another audio track must suppress non-solo tracks');
assert.equal(Engine.trackActive(project, false), false, 'boolean false must not activate track 0');
assert.equal(Engine.trackActive(project, true), false, 'boolean true must not activate track 1');

const active = Engine.activeAudioClips(project).map(clip => clip.id);
assert.deepEqual(active, ['sfx'], 'normalization must honor solo/mute state and reject blank/boolean identities while preserving valid ones');

const zeroProject = { clips: [{ id: 'zero', track: 4, asset: 0 }] };
assert.deepEqual(Engine.activeAudioClips(zeroProject).map(clip => clip.id), ['zero'], 'asset id 0 must be eligible for normalization');

const lockedProject={
  trackState:{'04':{locked:true}},
  trackStates:{'05':{locked:true}},
  clips:[
    {id:'voice-track-lock',track:4,asset:0},
    {id:'music-legacy-lock',track:'5.0',asset:7},
    {id:'sfx-clip-lock',track:'06',asset:'voice-A',locked:true},
    {id:'sfx-free',track:6,asset:'voice-A'},
  ],
};
assert.equal(Engine.trackLocked(lockedProject,'4.0'),true,'current trackState aliases must lock normalization');
assert.equal(Engine.trackLocked(lockedProject,'05'),true,'legacy trackStates aliases must lock normalization');
assert.equal(Engine.clipLocked(lockedProject,lockedProject.clips[2]),true,'clip.locked must prevent normalization');
assert.equal(Engine.clipLocked(lockedProject,lockedProject.clips[3]),false,'unlocked clips on unlocked tracks must remain editable');
assert.deepEqual(Engine.mutableAudioClips(lockedProject).map(clip=>clip.id),['sfx-free'],'bulk normalization must skip every locked clip atomically');

const precedenceProject={trackStates:{'06':{locked:true}},trackState:{6:{locked:false}},clips:[{id:'sfx',track:6,asset:0}]};
assert.equal(Engine.trackLocked(precedenceProject,6),true,'a legacy lock must not be cancelled by an unlocked duplicate current alias');
assert.deepEqual(Engine.mutableAudioClips(precedenceProject),[],'locked aliases must never leak into bulk normalization');

const invalidLockProject={trackState:{'6.5':{locked:true},7:{locked:true}},clips:[{id:'sfx',track:6,asset:0}]};
assert.equal(Engine.trackLocked(invalidLockProject,6),false,'invalid track aliases must not lock a valid audio track');
assert.deepEqual(Engine.mutableAudioClips(invalidLockProject).map(clip=>clip.id),['sfx'],'invalid lock aliases must not suppress valid clips');

const booleanLockProject={trackState:{false:{locked:true},true:{locked:true}},clips:[{id:'sfx',track:6,asset:0}]};
assert.equal(Engine.trackLocked(booleanLockProject,6),false,'boolean-looking state keys must not contaminate valid tracks');
assert.deepEqual(Engine.mutableAudioClips(booleanLockProject).map(clip=>clip.id),['sfx'],'invalid boolean aliases must not suppress normalization');

console.log('ProfitMente Studio audio normalization identity QA: PASS');
