import assert from 'node:assert/strict';
import './timeline-operations.js';
import './timeline-track-alias-guard.js';
const Ops=globalThis.ProfitMenteTimelineOperations;
const guard=globalThis.ProfitMenteTimelineTrackAliasGuard;
assert.ok(Ops&&guard,'timeline alias guard must load');
assert.equal(guard.canonicalTrack('0.0'),0);
assert.equal(guard.canonicalTrack('06'),6);
assert.equal(guard.canonicalTrack('-0'),0);
assert.equal(Object.is(guard.canonicalTrack('-0'),-0),false,'negative zero must be normalized');
assert.equal(guard.canonicalTrack('1.5'),null);
assert.equal(guard.canonicalTrack('7'),null);
assert.equal(guard.canonicalTrack(false),null,'boolean false must not alias track 0');
assert.equal(guard.canonicalTrack(true),null,'boolean true must not alias track 1');
assert.equal(guard.canonicalTrack({valueOf:()=>0}),null,'objects must not coerce into tracks');
assert.equal(guard.canonicalTrack(Symbol('0')),null,'symbols must be rejected without throwing');

const ops=new Ops();
const locked={duration:12,trackStates:{'0.0':{locked:true}},clips:[
  {id:'a',track:'0.0',start:0,duration:3},
  {id:'b',track:'00',start:6,duration:2}
]};
assert.equal(ops.trackLocked(locked,0),true,'legacy track alias lock must protect canonical track 0');
assert.equal(ops.closeGaps(locked,0),0,'locked alias track must block edit');

const close={duration:12,clips:[
  {id:'a',track:'0.0',start:0,duration:3},
  {id:'b',track:'00',start:6,duration:2}
]};
assert.equal(ops.closeGaps(close,0),1);
assert.deepEqual(close.clips.map(c=>c.track),[0,0],'valid legacy aliases must be canonicalized');
assert.equal(close.clips[1].start,3);

const ripple={duration:12,clips:[
  {id:'x',track:'0.0',start:0,duration:2},
  {id:'y',track:'00',start:4,duration:2},
  {id:'z',track:1,start:4,duration:2}
]};
ops.rippleDelete(ripple,'x');
assert.equal(ripple.clips.find(c=>c.id==='y').start,2,'canonical aliases must ripple together');
assert.equal(ripple.clips.find(c=>c.id==='z').start,4,'other tracks must stay fixed');

ops.copy({id:'copy',track:'01',start:0,duration:1,name:'copy'});
const pasteProject={duration:5,clips:[]};
const pasted=ops.paste(pasteProject,1,null);
assert.equal(pasted.track,1,'pasted legacy track must become canonical');
assert.equal(pasteProject.clips[0].track,1);

const invalid={duration:5,clips:[
  {id:'fractional',track:'1.5',start:0,duration:1},
  {id:'boolean',track:false,start:2,duration:1},
  {id:'object',track:{valueOf:()=>0},start:4,duration:1}
]};
guard.normalizeProjectTracks(invalid);
assert.equal(invalid.clips[0].track,'1.5','invalid fractional tracks must not be silently rewritten');
assert.equal(invalid.clips[1].track,false,'boolean tracks must not be silently rewritten as track 0');
assert.equal(typeof invalid.clips[2].track,'object','object tracks must not be silently rewritten');
assert.equal(ops.closeGaps(invalid,0),0,'invalid identities must not be edited as canonical track 0');
console.log('timeline track alias guard ok');
