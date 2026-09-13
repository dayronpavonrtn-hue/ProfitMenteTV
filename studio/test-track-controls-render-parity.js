const assert=require('assert');
const {ProfitMenteTrackSoloEngine:Engine}=require('./track-controls.js');

function testAliasPrecedence(){
  const states=Engine.merge({
    '0':{hidden:true},
    '0.0':{hidden:false},
    '04':{muted:true},
    '4.0':{muted:'true'}
  },{});
  assert.strictEqual(states[0].hidden,false,'later canonical alias must override earlier visual state');
  assert.strictEqual(states[4].muted,false,'string true must not become a strict mute');
}

function testCurrentOverridesLegacy(){
  const states=Engine.merge(
    {'00':{hidden:false,locked:'true'},'6.0':{muted:false}},
    {'0.0':{hidden:true,locked:true},'06':{muted:true}}
  );
  assert.strictEqual(states[0].hidden,false,'current hidden=false must override legacy true');
  assert.strictEqual(states[0].locked,false,'non-boolean current lock must normalize to false');
  assert.strictEqual(states[6].muted,false,'current muted=false must override legacy true');
}

function testLegacyFieldsSurviveWhenCurrentOmitsThem(){
  const states=Engine.merge({'0':{locked:true}},{'0.0':{hidden:true}});
  assert.strictEqual(states[0].hidden,true);
  assert.strictEqual(states[0].locked,true);
}

function testStrictFlags(){
  const states=Engine.merge({
    '1':{hidden:'true',locked:1,solo:[],muted:true},
    '5':{muted:'false',solo:1}
  },{});
  assert.strictEqual(states[1].hidden,false);
  assert.strictEqual(states[1].locked,false);
  assert.strictEqual(states[1].solo,false);
  assert.strictEqual(states[1].muted,true);
  assert.strictEqual(states[5].muted,false);
  assert.strictEqual(states[5].solo,false);
}

function testSoloAndToggleBehavior(){
  const visual=Engine.merge({'01':{solo:true}},{});
  Engine.apply(visual);
  assert.strictEqual(visual[1].solo,true);
  assert.strictEqual(visual[0].hidden,true);
  assert.strictEqual(visual[1].hidden,false);
  assert.strictEqual(visual[2].hidden,true);

  assert.strictEqual(Engine.toggleSolo(visual,1),false,'solo toggle must mutate canonical state');
  assert.strictEqual(visual[0].hidden,false,'removing solo must restore visual visibility');
  assert.strictEqual(Engine.toggleHidden(visual,'0.0'),true,'legacy alias must toggle canonical visual track');
  assert.strictEqual(visual[0].hidden,true);

  const audio=Engine.merge({'06':{solo:true}},{});
  Engine.apply(audio);
  assert.strictEqual(audio[4].muted,true);
  assert.strictEqual(audio[6].muted,false);
  assert.strictEqual(Engine.toggleMuted(audio,'4.0'),true,'legacy alias must toggle canonical audio track');
  assert.strictEqual(audio[4]._soloMutedBase,true,'mute preference must survive while another audio track is solo');
}

function testRenderableFilter(){
  const states=Engine.merge({'00':{hidden:true},'4.0':{muted:true}},{});
  const clips=[{id:'v0',track:0},{id:'v1',track:1},{id:'a4',track:4}];
  assert.deepStrictEqual(Engine.filterRenderableClips(clips,states).map(c=>c.id),['v1','a4']);
  assert.strictEqual(Engine.isAudioMuted(states,'04'),true);
}

for(const test of [testAliasPrecedence,testCurrentOverridesLegacy,testLegacyFieldsSurviveWhenCurrentOmitsThem,testStrictFlags,testSoloAndToggleBehavior,testRenderableFilter])test();
console.log('ProfitMente track controls/render parity regression: SUCCESS');
