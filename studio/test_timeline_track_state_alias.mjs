import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);

globalThis.ProfitMenteTimelineOperations=class {
  paste(project){return project}
  trimLeft(project){return project}
  trimRight(project){return project}
  split(project){return project}
  rippleDelete(project){return project}
  closeGaps(project){return project}
  insertGap(project){return project}
  insertTime(project){return project}
};

const guard=require('./timeline-track-alias-guard.js');
const project={
  clips:[
    {id:'caption',track:'03'},
    {id:'voice',track:' 06 '},
    {id:'visual',track:'00'},
    {id:'invalid',track:true}
  ],
  trackState:{
    '03':{locked:true,label:'legacy'},
    '3':{muted:true},
    '06':{locked:false},
    invalid:{locked:true}
  },
  trackStates:{'04':{locked:true}}
};

guard.normalizeProjectTracks(project);
assert.equal(project.clips[0].track,3,'caption alias must become canonical track 3');
assert.equal(project.clips[1].track,6,'voice alias must become canonical track 6');
assert.equal(project.clips[2].track,0,'visual alias must become canonical track 0');
assert.equal(project.clips[3].track,true,'invalid boolean track must not be coerced');
assert.deepEqual(project.trackState['3'],{locked:true,label:'legacy',muted:true},'duplicate aliases must merge without losing a lock');
assert.equal('03' in project.trackState,false,'legacy alias key must be removed after normalization');
assert.deepEqual(project.trackState['6'],{locked:false},'track state alias must become canonical key');
assert.deepEqual(project.trackStates['4'],{locked:true},'alternate trackStates map must also normalize');
assert.equal(guard.stateLocked(project.trackState,'03'),true,'lock lookup must accept legacy alias after canonicalization');
assert.equal(guard.stateLocked(project.trackStates,4),true,'lock lookup must preserve alternate map lock');
assert.equal(guard.canonicalTrack(true),null,'boolean tracks are invalid');
assert.equal(guard.canonicalTrack({toString(){return '3'}}),null,'objects must not be coerced into tracks');

const ops=new globalThis.ProfitMenteTimelineOperations();
assert.equal(ops.trackLocked(project,'3.0'),true,'timeline operations must see canonicalized legacy locks');

console.log('timeline track/state alias regression: PASS');
