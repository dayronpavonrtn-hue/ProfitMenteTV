import assert from 'node:assert/strict';
import trackControls from './track-controls.js';

const {ProfitMenteTrackSoloEngine: Engine}=trackControls;

function merged(current={},legacy={}){return Engine.merge(current,legacy)}

{
  const state=merged({}, {'0':{locked:true,hidden:true},'5':{muted:true}});
  assert.equal(state[0].locked,true,'legacy visual lock must migrate');
  assert.equal(state[0].hidden,true,'legacy hidden state must migrate');
  assert.equal(state[5].muted,true,'legacy audio mute must migrate');
}

{
  const state=merged({0:{locked:false,hidden:false},5:{muted:false}}, {0:{locked:true,hidden:true},5:{muted:true}});
  assert.equal(state[0].locked,true,'legacy lock must win a conflicting permissive current value');
  assert.equal(state[0].hidden,true,'legacy hidden must win a conflicting permissive current value');
  assert.equal(state[5].muted,true,'legacy mute must win a conflicting permissive current value');
}

{
  const state=merged({1:{solo:true}},{});
  Engine.apply(state);
  assert.equal(state[1].hidden,false,'current visual solo track remains visible');
  assert.equal(state[0].hidden,true,'current visual solo hides non-solo visual tracks');
  assert.equal(state[3].hidden,true,'current visual solo also hides caption track');
}

{
  const state=merged({}, {'6':{solo:true}});
  Engine.apply(state);
  assert.equal(state[6].muted,false,'legacy audio solo track remains audible');
  assert.equal(state[4].muted,true,'legacy audio solo mutes non-solo SFX track');
  assert.equal(state[5].muted,true,'legacy audio solo mutes non-solo music track');
}

{
  const state=merged({2:{locked:true,custom:'current'}},{'2':{locked:false,custom:'legacy',legacyOnly:7}});
  assert.equal(state[2].locked,true);
  assert.equal(state[2].custom,'current','current non-boolean metadata should take precedence');
  assert.equal(state[2].legacyOnly,7,'legacy auxiliary metadata should be preserved during migration');
}

{
  const state=merged(null,null);
  assert.deepEqual(Object.keys(state),['0','1','2','3','4','5','6']);
  for(let i=0;i<7;i++)assert.deepEqual(
    {locked:state[i].locked,hidden:state[i].hidden,muted:state[i].muted,solo:state[i].solo},
    {locked:false,hidden:false,muted:false,solo:false},
    `track ${i} should receive safe defaults`
  );
}

console.log('track state legacy parity regressions passed');
