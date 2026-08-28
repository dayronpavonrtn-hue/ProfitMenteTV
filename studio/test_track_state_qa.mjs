import assert from 'node:assert/strict';
globalThis.window=globalThis;
await import('./qa-engine.js');
const qa=new ProfitMenteQAEngine();
const assets=[
  {id:'v1',name:'visual.mp4',type:'video',duration:5,width:1080,height:1920},
  {id:'a1',name:'voice.wav',type:'audio',duration:5}
];
const base={duration:5,format:'9:16',clips:[
  {id:'v',track:0,asset:'v1',name:'Visual',start:0,duration:5},
  {id:'c',track:3,name:'Caption',start:0,duration:5},
  {id:'a',track:6,asset:'a1',name:'Voice',start:0,duration:5}
]};
let r=qa.inspect({...base,trackState:{}},assets);
assert.equal(r.metrics.visualCoverage,100);
assert.equal(r.metrics.captionCoverage,100);
assert.equal(r.metrics.activeAudioClips,1);
assert.deepEqual(r.metrics.disabledTracks,[]);
r=qa.inspect({...base,trackState:{0:{hidden:true},3:{hidden:true},6:{muted:true}}},assets);
assert.equal(r.metrics.visualCoverage,0);
assert.equal(r.metrics.captionCoverage,0);
assert.equal(r.metrics.activeAudioClips,0);
assert.deepEqual(r.metrics.disabledTracks,[0,3,6]);
assert(r.warnings.some(x=>x.includes('Pistas desactivadas')));
const disabledMissing={duration:5,format:'9:16',trackState:{0:{hidden:true},2:{hidden:true},3:{hidden:true},6:{muted:true}},clips:[
  {id:'mv',track:0,asset:'missing-video',name:'Oculto',start:0,duration:5,fitMode:'invalid',keyframes:{start:{},end:{}}},
  {id:'mm',track:2,name:'',start:0,duration:2,textStyle:'invalid'},
  {id:'mc',track:3,name:'Caption oculto',start:0,duration:2,wordTimings:'invalid'},
  {id:'ma',track:6,asset:'missing-audio',name:'Audio silenciado',start:0,duration:5,fadeIn:99}
]};
r=qa.inspect(disabledMissing,[]);
assert.equal(r.ok,true,r.issues.join(' | '));
assert(!r.issues.some(x=>x.includes('Medio faltante')));
console.log('Track-state QA OK');
