'use strict';

const assert=require('assert');
const {ProfitMenteQAEngine}=require('./qa-engine.js');

const qa=new ProfitMenteQAEngine();
const assets=[
  {id:'v0',name:'A.mp4',type:'video',duration:10,width:1080,height:1920},
  {id:'v1',name:'B.mp4',type:'video',duration:10,width:1080,height:1920},
  {id:'a5',name:'Music.mp3',type:'audio',duration:10},
  {id:'a6',name:'Voice.mp3',type:'audio',duration:10}
];
const clips=[
  {id:'v0c',name:'A',track:0,asset:'v0',start:0,duration:5},
  {id:'v1c',name:'B',track:1,asset:'v1',start:5,duration:5},
  {id:'a5c',name:'Music',track:5,asset:'a5',start:0,duration:10,muted:'false'},
  {id:'a6c',name:'Voice',track:6,asset:'a6',start:0,duration:10}
];
const base={version:'1.3',name:'Strict flags',duration:10,format:'9:16',clips};

function inspect(extra={}){
  return qa.inspect({...base,...extra,clips:clips.map(c=>({...c}))},assets);
}

// Imported/corrupt scalar values must not become active booleans merely because
// JavaScript considers non-empty strings or non-zero numbers truthy.
let result=inspect({
  trackState:{
    0:{hidden:'false',locked:'true',solo:'false'},
    5:{muted:'false',solo:'false'}
  },
  trackStates:{
    1:{hidden:1,solo:'true'},
    6:{muted:1,solo:1}
  }
});
assert.strictEqual(result.metrics.visualCoverage,100,'truthy non-booleans must not hide or solo visual tracks');
assert.strictEqual(result.metrics.activeAudioClips,2,'truthy non-booleans and clip muted="false" must not mute/solo audio');
assert(!result.metrics.disabledTracks.includes(0),'track 0 must remain enabled');
assert(!result.metrics.disabledTracks.includes(1),'legacy track 1 must remain enabled');
assert(!result.metrics.disabledTracks.includes(5),'track 5 must remain enabled');
assert(!result.metrics.disabledTracks.includes(6),'legacy track 6 must remain enabled');

// Real booleans still retain their intended meaning.
result=inspect({trackState:{0:{solo:true},5:{muted:true}}});
assert.strictEqual(result.metrics.visualCoverage,50,'boolean solo=true must isolate the selected visual track');
assert.strictEqual(result.metrics.activeAudioClips,1,'boolean muted=true must remove the audio track from active QA metrics');
assert(result.metrics.disabledTracks.includes(1),'non-solo visual track must be disabled while solo is active');
assert(result.metrics.disabledTracks.includes(5),'muted audio track must be disabled');

// Clip-level mute follows the same strict contract as preview/render.
const clipMutedProject={...base,clips:clips.map(c=>c.id==='a5c'?{...c,muted:true}:{...c})};
result=qa.inspect(clipMutedProject,assets);
assert.strictEqual(result.metrics.activeAudioClips,1,'boolean clip muted=true must remain honored');

console.log('ProfitMente QA strict boolean flags regression: OK');
