#!/usr/bin/env node
const assert=require('assert');
const {ProfitMenteQAEngine}=require('./qa-engine.js');
const Guard=require('./qa-legacy-track-state-guard.js');
const QAAutofix=require('./qa-autofix.js');

assert.strictEqual(Guard.install(),false,'guard should already be installed by module load');
const qa=new ProfitMenteQAEngine();

function inspect(extra={}){
  return qa.inspect({
    duration:10,
    clips:[
      {id:'v1',name:'Legacy hidden video',track:0,start:0,duration:10,asset:'missing-video'},
      {id:'a1',name:'Legacy muted audio',track:5,start:0,duration:10,asset:'missing-audio'}
    ],
    ...extra
  },[]);
}

let r=inspect({trackStates:{0:{hidden:true},5:{muted:true}}});
assert(!r.issues.some(x=>x.includes('Medio faltante')),'legacy disabled tracks must not report missing media');
assert(r.warnings.some(x=>x.includes('Pistas desactivadas')&&x.includes('0')&&x.includes('5')),'legacy disabled tracks must be reported');
assert.strictEqual(r.metrics.visualCoverage,0,'hidden legacy visual track must not count toward coverage');
assert.strictEqual(r.metrics.activeAudioClips,0,'muted legacy audio track must not count as active');

r=inspect({trackState:{0:{hidden:false},5:{muted:false}},trackStates:{0:{hidden:true},5:{muted:true}}});
assert(!r.issues.some(x=>x.includes('Medio faltante')),'legacy true must win over conflicting current false');
assert(r.warnings.some(x=>x.includes('Pistas desactivadas')),'conflicting legacy disabled state must remain visible to QA');

r=inspect({trackState:{0:{hidden:false},5:{muted:false}},trackStates:{}});
assert.strictEqual(r.issues.filter(x=>x.includes('Medio faltante')).length,2,'active tracks must still report missing media');

// Imported JSON may preserve numerically-equivalent track keys such as "0.0"
// or "5.00". QA must resolve them exactly like preview/render do.
r=inspect({trackStates:{'0.0':{hidden:true},'5.00':{muted:true}}});
assert(!r.issues.some(x=>x.includes('Medio faltante')),'numeric legacy aliases must disable the same tracks in QA');
assert(r.metrics.disabledTracks.includes(0)&&r.metrics.disabledTracks.includes(5),'numeric legacy aliases must appear in disabled track metrics');

r=inspect({trackState:{'0.00':{hidden:true},'5.0':{muted:true}}});
assert(!r.issues.some(x=>x.includes('Medio faltante')),'numeric modern aliases must disable the same tracks in QA');

// Semantic Solo may be the only persisted signal after import/recovery. QA must
// derive the same effective hidden/muted state as preview and the MP4 renderer.
r=inspect({trackStates:{1:{solo:true},6:{solo:true}}});
assert(!r.issues.some(x=>x.includes('Medio faltante')),'non-Solo tracks must not block QA when semantic Solo is persisted without materialized hidden/muted flags');
assert.strictEqual(r.metrics.visualCoverage,0,'non-Solo visual track must not count toward coverage');
assert.strictEqual(r.metrics.activeAudioClips,0,'non-Solo audio track must not count as active');
assert(r.metrics.disabledTracks.includes(0)&&r.metrics.disabledTracks.includes(5),'QA must report tracks disabled by semantic Solo');

r=inspect({trackState:{0:{hidden:false},5:{muted:false}},trackStates:{1:{solo:true},6:{solo:true}}});
assert(!r.issues.some(x=>x.includes('Medio faltante')),'legacy semantic Solo must remain effective when current state contains conflicting false flags');

r=inspect({trackStates:{'1.0':{solo:true},'6.00':{solo:true}}});
assert(!r.issues.some(x=>x.includes('Medio faltante')),'numeric Solo aliases must exclude non-Solo tracks from QA');
assert(r.metrics.disabledTracks.includes(0)&&r.metrics.disabledTracks.includes(5),'numeric Solo aliases must produce effective disabled tracks');

const normalized=Guard.normalize({trackState:{'0':{hidden:false}},trackStates:{'0':{hidden:true,locked:true},'1':{solo:true},'6':{solo:true}}});
assert.strictEqual(normalized.trackState['0'].hidden,true);
assert.strictEqual(normalized.trackState['0'].locked,true);
assert.strictEqual(normalized.trackState['1'].solo,true);
assert.strictEqual(normalized.trackState['6'].solo,true);
assert.strictEqual(normalized.trackState['5'].muted,true,'audio Solo must materialize mute on non-Solo audio tracks');

// Browser Solo bookkeeping must expose the user's original manual state before
// recalculating Solo, otherwise a stale materialized flag can become permanent.
const stale=Guard.normalize({trackState:{
  0:{hidden:true,_soloVisualActive:true,_soloHiddenBase:false},
  1:{solo:true},
  5:{muted:true,_soloAudioActive:true,_soloMutedBase:false},
  6:{solo:true}
}});
assert.strictEqual(stale.trackState['0'].hidden,true,'non-Solo visual remains hidden while visual Solo is active');
assert.strictEqual(stale.trackState['5'].muted,true,'non-Solo audio remains muted while audio Solo is active');
assert(!('_soloVisualActive' in stale.trackState['0']),'QA normalization must strip browser-only visual Solo bookkeeping');
assert(!('_soloAudioActive' in stale.trackState['5']),'QA normalization must strip browser-only audio Solo bookkeeping');

const lockedProject={duration:10,trackState:{0:{locked:false}},trackStates:{0:{locked:true}},clips:[{id:'locked',track:0,start:-2,duration:-1,fitMode:'invalid',speed:99}]};
const before=JSON.stringify(lockedProject.clips[0]);
const fixed=QAAutofix.repair(lockedProject,[]);
assert.strictEqual(fixed.skippedLocked,1,'legacy track lock must protect clip from safe repair');
assert.strictEqual(JSON.stringify(lockedProject.clips[0]),before,'legacy locked clip must remain unchanged');

const openProject={duration:10,trackStates:{0:{locked:false}},clips:[{id:'open',track:0,start:-2,duration:-1,fitMode:'invalid',speed:99}]};
const repaired=QAAutofix.repair(openProject,[]);
assert.strictEqual(repaired.skippedLocked,0,'unlocked legacy track must remain editable');
assert.strictEqual(openProject.clips[0].start,0);
assert.strictEqual(openProject.clips[0].duration,.05);
assert.strictEqual(openProject.clips[0].fitMode,'cover');
assert.strictEqual(openProject.clips[0].speed,4);

console.log('QA legacy track-state + numeric alias + semantic Solo compatibility + safe repair lock parity OK');
