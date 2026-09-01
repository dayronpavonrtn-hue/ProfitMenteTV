import assert from 'node:assert/strict';
import './timeline-operations.js';
import './timeline-paste-extension.js';

const Ops=globalThis.ProfitMenteTimelineOperations;
assert.ok(Ops,'Timeline operations engine was not exported');

const ops=new Ops();
const source={id:'source',track:0,name:'Scene',start:0,duration:4,asset:'video-a'};
ops.copy(source);

const project={
  duration:10,
  trackState:{0:{locked:false}},
  trackStates:{0:{locked:true}},
  clips:[]
};

assert.equal(ops.paste(project,9,0),null,'legacy lock must remain authoritative when modern state also exists');
assert.equal(project.clips.length,0,'blocked paste must not mutate clips');
assert.equal(project.duration,10,'blocked paste must not mutate project duration');

project.trackStates[0].locked=false;
const pasted=ops.paste(project,9,0);
assert.ok(pasted,'paste should succeed after unlocking the destination track');
assert.equal(pasted.start,9,'paste must respect the requested playhead position');
assert.equal(pasted.duration,4);
assert.equal(project.duration,13,'project duration must grow to contain a paste beyond the previous end');
assert.notEqual(pasted.id,source.id,'paste must clone the clip identity');

const later=ops.paste(project,18,1);
assert.ok(later);
assert.equal(later.track,1);
assert.equal(later.start,18,'paste beyond the current sequence must not be pulled backward');
assert.equal(project.duration,22,'sequence must continue growing to the pasted clip end');

const negative=ops.paste(project,-5,1);
assert.equal(negative.start,0,'negative paste time must clamp to zero');
assert.equal(project.duration,22,'pasting earlier must never shrink sequence duration');

console.log('timeline paste extension ok');
