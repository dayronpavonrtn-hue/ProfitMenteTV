import assert from 'node:assert/strict';
import './timeline-operations.js';
import './media-placement-engine.js';

const Ops=globalThis.ProfitMenteTimelineOperations;
const Placement=globalThis.ProfitMenteMediaPlacementEngine;
assert.ok(Ops&&Placement,'placement dependencies must export');
const ops=new Ops();

const legacyOnly={
  duration:20,
  trackStates:{0:{locked:true}},
  clips:[{id:'a',track:0,start:2,duration:4,asset:'a.mp4'}]
};
const legacyBefore=structuredClone(legacyOnly);
assert.equal(Placement.trackLocked(legacyOnly,0),true,'legacy trackStates lock must be detected');
assert.equal(Placement.insertSpace(legacyOnly,0,3,2,ops).reason,'locked-track');
assert.deepEqual(legacyOnly,legacyBefore,'legacy-locked insert must remain atomic');
assert.equal(Placement.overwriteRange(legacyOnly,0,3,2,ops).reason,'locked-track');
assert.deepEqual(legacyOnly,legacyBefore,'legacy-locked overwrite must remain atomic');

const mixed={
  duration:20,
  trackState:{0:{locked:false}},
  trackStates:{0:{locked:true}},
  clips:[{id:'b',track:0,start:4,duration:3,asset:'b.mp4'}]
};
const mixedBefore=structuredClone(mixed);
assert.equal(Placement.trackLocked(mixed,0),true,'any lock across canonical or legacy state must prevail');
assert.equal(Placement.insertSpace(mixed,0,2,1,ops).reason,'locked-track');
assert.deepEqual(mixed,mixedBefore,'mixed-state lock must not mutate project');

const canonicalOnly={trackState:{'5':{locked:true}},trackStates:{'5':{locked:false}}};
assert.equal(Placement.trackLocked(canonicalOnly,5),true,'canonical lock must still prevail when legacy state says unlocked');
assert.equal(Placement.trackLocked({trackState:{0:{locked:false}},trackStates:{0:{locked:false}}},0),false,'track remains editable only when both schemas are unlocked');

const aliased={
  duration:20,
  trackState:{'04':{locked:true}},
  trackStates:{'5.0':{locked:true},'6.5':{locked:true},'7':{locked:true}},
  clips:[
    {id:'c',track:'4.0',start:1,duration:2,asset:'c.mp4'},
    {id:'d',track:'05',start:5,duration:2,asset:'d.mp4'},
    {id:'invalid',track:'6.5',start:8,duration:2,asset:'invalid.mp4'}
  ]
};
assert.equal(Placement.trackLocked(aliased,4),true,'zero-padded legacy lock must protect canonical track 4');
assert.equal(Placement.trackLocked(aliased,'04'),true,'canonical lookup must accept zero-padded target alias');
assert.equal(Placement.trackLocked(aliased,5),true,'decimal legacy lock alias must protect canonical track 5');
assert.equal(Placement.trackLocked(aliased,6),false,'invalid fractional state key must not become track 6');
assert.equal(Placement.trackLocked(aliased,7),false,'out-of-range state key must not become a valid track');
assert.deepEqual(Placement.onTrack(aliased,4).map(c=>c.id),['c'],'clip track aliases must resolve canonically');
assert.deepEqual(Placement.onTrack(aliased,'5.0').map(c=>c.id),['d'],'zero-padded clip track aliases must resolve canonically');
assert.equal(Placement.onTrack(aliased,6).some(c=>c.id==='invalid'),false,'fractional clip track aliases must not leak onto canonical tracks');

for(const badTrack of [6.5,'6.5',7,'7','',null,undefined]){
  const project={duration:20,clips:[{id:'safe',track:6,start:2,duration:2,asset:'safe.mp4'}]};
  const before=structuredClone(project);
  assert.equal(Placement.insertSpace(project,badTrack,2,1,ops).reason,'invalid-track',`insert must reject invalid target track ${String(badTrack)}`);
  assert.deepEqual(project,before,'invalid insert target must remain atomic');
  assert.equal(Placement.overwriteRange(project,badTrack,2,1,ops).reason,'invalid-track',`overwrite must reject invalid target track ${String(badTrack)}`);
  assert.deepEqual(project,before,'invalid overwrite target must remain atomic');
}

console.log('media placement legacy lock ok');
