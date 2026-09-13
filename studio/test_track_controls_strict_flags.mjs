import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {ProfitMenteTrackSoloEngine:Engine}=require('./track-controls.js');

const corrupt={
  0:{locked:'false',hidden:'false',solo:0},
  1:{hidden:'true'},
  4:{muted:'false',solo:'true'},
  5:{muted:1,locked:[]},
  6:{muted:true,locked:true}
};
const normalized=Engine.ensure(corrupt);
assert.equal(normalized[0].locked,false);
assert.equal(normalized[0].hidden,false);
assert.equal(normalized[1].hidden,false);
assert.equal(normalized[4].muted,false);
assert.equal(normalized[4].solo,false);
assert.equal(normalized[5].muted,false);
assert.equal(normalized[5].locked,false);
assert.equal(normalized[6].muted,true);
assert.equal(normalized[6].locked,true);

const merged=Engine.merge(
  {0:{hidden:'false'},4:{muted:false},6:{solo:'false'}},
  {0:{hidden:true},4:{muted:'true'},6:{solo:true}}
);
assert.equal(merged[0].hidden,true,'real legacy true must survive migration');
assert.equal(merged[4].muted,false,'legacy string true must not mute audio');
assert.equal(merged[6].solo,true,'real legacy solo true must survive migration');

const audioStates=Engine.ensure({4:{solo:'true'},5:{solo:true,muted:'false'},6:{muted:true}});
Engine.apply(audioStates);
assert.equal(audioStates[4].solo,false,'string solo must remain inactive');
assert.equal(audioStates[4].muted,true,'non-solo audio track must be muted by a real solo on track 5');
assert.equal(audioStates[5].muted,false,'real solo track must remain audible when its baseline mute is false');
assert.equal(audioStates[6].muted,true,'pre-existing real mute must survive solo mode');
Engine.toggleSolo(audioStates,5);
assert.equal(audioStates[4].muted,false,'leaving solo restores the original unmuted baseline');
assert.equal(audioStates[6].muted,true,'leaving solo restores a real pre-existing mute');

const visualStates=Engine.ensure({0:{hidden:'true'},1:{hidden:true},2:{hidden:false}});
assert.equal(Engine.isVisualHidden(visualStates,0),false);
assert.equal(Engine.isVisualHidden(visualStates,1),true);
assert.deepEqual(
  Engine.filterRenderableClips([{id:'a',track:0},{id:'b',track:1},{id:'c',track:2}],visualStates).map(c=>c.id),
  ['a','c']
);

console.log('Track controls strict boolean flags OK');
