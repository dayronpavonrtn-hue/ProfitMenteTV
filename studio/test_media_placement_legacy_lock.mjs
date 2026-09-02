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

console.log('media placement legacy lock ok');
