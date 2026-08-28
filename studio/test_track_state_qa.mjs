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
console.log('Track-state QA OK');