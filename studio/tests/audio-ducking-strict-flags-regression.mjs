import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const Ducking=require('../audio-ducking-engine.js');

const music={id:'music',track:5,asset:'music',start:0,duration:10,volume:.3,duckVolume:.1};
const voice={id:'voice',track:6,asset:'voice',start:2,duration:2};

assert.deepEqual(
  Ducking.intervals({clips:[music,{...voice,muted:'false'}]},music),
  [{start:2,end:4}],
  'string "false" on a voice clip must not mute it'
);
assert.deepEqual(
  Ducking.intervals({clips:[music,{...voice,muted:0}]},music),
  [{start:2,end:4}],
  'numeric false-like clip flags must not mute voice'
);
assert.deepEqual(
  Ducking.intervals({clips:[music,{...voice,muted:true}]},music),
  [],
  'only boolean true may mute a voice clip'
);

for(const value of ['false',0,1,null]){
  const project={clips:[music,voice],trackState:{6:{muted:value}}};
  assert.deepEqual(
    Ducking.intervals(project,music),
    [{start:2,end:4}],
    `non-boolean track muted=${String(value)} must stay inactive`
  );
}
assert.deepEqual(
  Ducking.intervals({clips:[music,voice],trackState:{6:{muted:true}}},music),
  [],
  'boolean true track mute must disable ducking voice'
);

for(const value of ['false',0,1,null]){
  const project={clips:[music,voice],trackState:{5:{solo:value}}};
  assert.deepEqual(
    Ducking.intervals(project,music),
    [{start:2,end:4}],
    `non-boolean solo=${String(value)} must not create Solo state`
  );
}
assert.deepEqual(
  Ducking.intervals({clips:[music,voice],trackState:{5:{solo:true}}},music),
  [],
  'real music Solo excludes voice track and therefore disables ducking'
);

const aliasProject={
  clips:[music,voice],
  trackState:{'06':{muted:'false'}},
  trackStates:{'6.0':{muted:true}}
};
assert.deepEqual(
  Ducking.intervals(aliasProject,music),
  [],
  'a real true legacy alias must remain protective even if another alias contains string false'
);

console.log('audio ducking strict flags regression: OK');
