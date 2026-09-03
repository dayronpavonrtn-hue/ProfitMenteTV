import assert from 'node:assert/strict';
globalThis.window=globalThis;
globalThis.document={};
await import('./qa-engine.js');
const qa=new ProfitMenteQAEngine();
const project={duration:5,format:'9:16',trackState:{},clips:[{id:'v',track:0,asset:'v1',name:'Visual',start:0,duration:5}]};
let assets=[{id:'v1',name:'visual.mp4',type:'video',duration:5,width:1080,height:1920,blob:new Blob(['ok'],{type:'video/mp4'})}];
let r=qa.inspect(project,assets);assert.equal(r.ok,true,r.issues.join(' | '));
assets=[{id:'v1',name:'wrong.wav',type:'audio',duration:5,blob:new Blob(['ok'],{type:'audio/wav'})}];
r=qa.inspect(project,assets);assert(r.issues.some(x=>x.includes('Tipo de medio incompatible')),r.issues.join(' | '));
assets=[{id:'v1',name:'empty.mp4',type:'video',duration:5,blob:new Blob([],{type:'video/mp4'})}];
r=qa.inspect(project,assets);assert(r.issues.some(x=>x.includes('Archivo de medio vacío')),r.issues.join(' | '));
const hidden={...project,trackState:{0:{hidden:true}}};r=qa.inspect(hidden,assets);assert(!r.issues.some(x=>x.includes('Archivo de medio vacío')),r.issues.join(' | '));
const audioProject={duration:5,format:'9:16',trackState:{},clips:[{id:'a',track:6,asset:'a1',name:'Voice',start:0,duration:5}]};
r=qa.inspect(audioProject,[{id:'a1',name:'image.png',type:'image',blob:new Blob(['x'],{type:'image/png'})}]);assert(r.issues.some(x=>x.includes('Tipo de medio incompatible')),r.issues.join(' | '));

const numericClip={duration:5,format:'9:16',trackState:{},clips:[{id:'legacy-number',track:0,asset:7,name:'Legacy numeric ref',start:0,duration:5}]};
r=qa.inspect(numericClip,[{id:'7',name:'legacy.mp4',type:'video',duration:5,width:1080,height:1920,blob:new Blob(['ok'],{type:'video/mp4'})}]);
assert(!r.issues.some(x=>x.includes('Medio faltante')),r.issues.join(' | '));
assert.equal(r.metrics.visualCoverage,100);

const numericAsset={duration:5,format:'9:16',trackState:{},clips:[{id:'legacy-string',track:0,asset:'8',name:'Legacy string ref',start:0,duration:5}]};
r=qa.inspect(numericAsset,[{id:8,name:'legacy-8.mp4',type:'video',duration:5,width:1080,height:1920,blob:new Blob(['ok'],{type:'video/mp4'})}]);
assert(!r.issues.some(x=>x.includes('Medio faltante')),r.issues.join(' | '));

const zeroId={duration:5,format:'9:16',trackState:{},clips:[{id:'legacy-zero',track:0,asset:0,name:'Legacy zero ref',start:0,duration:5}]};
r=qa.inspect(zeroId,[{id:'0',name:'zero.mp4',type:'video',duration:5,width:1080,height:1920,blob:new Blob(['ok'],{type:'video/mp4'})}]);
assert(!r.issues.some(x=>x.includes('Medio faltante')),r.issues.join(' | '));
assert.equal(r.metrics.visualCoverage,100);

const paddedId={duration:5,format:'9:16',trackState:{},clips:[{id:'legacy-padded',track:0,asset:' 9 ',name:'Legacy padded ref',start:0,duration:5}]};
r=qa.inspect(paddedId,[{id:9,name:'nine.mp4',type:'video',duration:5,width:1080,height:1920,blob:new Blob(['ok'],{type:'video/mp4'})}]);
assert(!r.issues.some(x=>x.includes('Medio faltante')),r.issues.join(' | '));

const emptyRef={duration:5,format:'9:16',trackState:{},clips:[{id:'empty-ref',track:0,asset:'   ',name:'Empty ref',start:0,duration:5}]};
r=qa.inspect(emptyRef,[{id:'',name:'invalid.mp4',type:'video',duration:5,width:1080,height:1920,blob:new Blob(['ok'],{type:'video/mp4'})}]);
assert.equal(r.metrics.visualCoverage,0);
assert(!r.issues.some(x=>x.includes('Medio faltante')));

console.log('Media integrity QA OK');
