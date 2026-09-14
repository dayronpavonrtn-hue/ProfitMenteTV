const assert=require('assert');
const {ProfitMenteTrackSoloEngine:Engine}=require('./track-controls.js');
const Guard=require('./qa-legacy-track-state-guard.js');

function testAliasPrecedence(){
  const states=Engine.merge({
    '0':{hidden:true},
    '0.0':{hidden:false},
    '04':{muted:true},
    '4.0':{muted:'true'}
  },{});
  assert.strictEqual(states[0].hidden,false,'later canonical alias must override earlier visual state inside one schema');
  assert.strictEqual(states[4].muted,false,'string true must not become a strict mute');
}

function testRestrictiveFlagsSurviveSchemaConflict(){
  const states=Engine.merge(
    {'00':{hidden:false,locked:'true',solo:false},'6.0':{muted:false}},
    {'0.0':{hidden:true,locked:true,solo:true},'06':{muted:true}}
  );
  assert.strictEqual(states[0].hidden,true,'legacy hidden=true must survive a conflicting permissive current value');
  assert.strictEqual(states[0].locked,true,'legacy locked=true must survive malformed/permissive current state');
  assert.strictEqual(states[0].solo,true,'legacy Solo must survive until schemas are canonicalized');
  assert.strictEqual(states[6].muted,true,'legacy muted=true must survive a conflicting permissive current value');
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

function testQAGuardUsesSameMergeRules(){
  const normalized=Guard.normalize({
    trackStates:{'0':{hidden:true},'0.0':{hidden:false},'06':{muted:true,solo:true}},
    trackState:{'00':{locked:true},'6.0':{muted:false,solo:false}}
  });
  assert.strictEqual(normalized.trackState['0'].hidden,false,'later alias inside legacy schema remains authoritative before cross-schema merge');
  assert.strictEqual(normalized.trackState['0'].locked,true,'QA guard must retain current schema fields');
  assert.strictEqual(normalized.trackState['6'].muted,false,'Solo track itself remains audible after effective Solo is applied');
  assert.strictEqual(normalized.trackState['6'].solo,true,'QA guard must preserve real legacy Solo across schema conflict');
  assert.strictEqual(normalized.trackState['4'].muted,true,'legacy audio Solo must mute other audio tracks exactly like preview/render');
  assert.deepStrictEqual(normalized.trackStates,{},'raw legacy state must not be re-read by QA');

  const malformed=Guard.normalize({trackState:{'':{hidden:true},'true':{hidden:true},'2':{hidden:'true',solo:1}}});
  assert.strictEqual(malformed.trackState['0'].hidden,false,'empty key must not alias track zero');
  assert.strictEqual(malformed.trackState['2'].hidden,false,'QA must use strict booleans');
  assert.strictEqual(malformed.trackState['2'].solo,false,'numeric solo must not activate');
}

for(const test of [testAliasPrecedence,testRestrictiveFlagsSurviveSchemaConflict,testLegacyFieldsSurviveWhenCurrentOmitsThem,testStrictFlags,testSoloAndToggleBehavior,testRenderableFilter,testQAGuardUsesSameMergeRules])test();
console.log('ProfitMente track controls/render parity regression: SUCCESS');
