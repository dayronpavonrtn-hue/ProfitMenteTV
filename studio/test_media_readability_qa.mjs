import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const ProfitMenteMediaInspector=require('./media-inspector.js');
const {ProfitMenteQAEngine}=require('./qa-engine.js');
const ProfitMenteMediaRelinkEngine=require('./media-relink-engine.js');

const inspector=new ProfitMenteMediaInspector();
assert.equal(inspector.version,2);
assert.equal(inspector.timeoutMs,12000);
inspector.inspectVideo=async()=>{throw new Error('Video inválido o códec no compatible')};
const bad=await inspector.inspect({id:'bad',name:'bad.mov',type:'video',blob:new Blob(['not-video']),metadataVersion:1});
assert.equal(bad.mediaReadable,false);
assert.match(bad.mediaError,/códec no compatible/);
assert.equal(bad.metadataVersion,2);
assert.match(inspector.label(bad),/no legible/);

const goodInspector=new ProfitMenteMediaInspector();
goodInspector.inspectVideo=async()=>({duration:10,width:1920,height:1080,thumbnail:null});
const good=await goodInspector.inspect({id:'good',name:'good.mp4',type:'video',blob:new Blob(['ok'])});
assert.equal(good.mediaReadable,true);
assert.equal(good.mediaError,'');
assert.equal(good.duration,10);

// Un decoder del navegador puede no emitir ni success ni error. La importación debe
// terminar de todas formas y marcar el medio como no legible, en vez de bloquearse.
const originalURL=globalThis.URL;
const originalDocument=globalThis.document;
const originalImage=globalThis.Image;
let revoked=0;
globalThis.URL={
  createObjectURL:()=>`blob:test-${Math.random()}`,
  revokeObjectURL:()=>{revoked++}
};
class StalledImage{set src(value){this._src=value}}
globalThis.Image=StalledImage;
globalThis.document={
  createElement(tag){
    if(tag==='audio') return {preload:'',duration:NaN,onloadedmetadata:null,onerror:null,set src(value){this._src=value}};
    if(tag==='video') return {
      preload:'',muted:false,playsInline:false,duration:2,videoWidth:1920,videoHeight:1080,
      onloadedmetadata:null,onseeked:null,onerror:null,_currentTime:0,
      set src(value){this._src=value;queueMicrotask(()=>this.onloadedmetadata?.())},
      set currentTime(value){this._currentTime=value},get currentTime(){return this._currentTime}
    };
    throw new Error(`Elemento inesperado: ${tag}`);
  }
};
try{
  const timeoutInspector=new ProfitMenteMediaInspector({timeoutMs:20});
  assert.equal(timeoutInspector.timeoutMs,20);

  const stuckImage=await timeoutInspector.inspect({id:'stuck-image',name:'stuck.png',type:'image',blob:new Blob(['x'])});
  assert.equal(stuckImage.mediaReadable,false);
  assert.match(stuckImage.mediaError,/Tiempo de espera agotado al leer la imagen/);

  const stuckAudio=await timeoutInspector.inspect({id:'stuck-audio',name:'stuck.wav',type:'audio',blob:new Blob(['x'])});
  assert.equal(stuckAudio.mediaReadable,false);
  assert.match(stuckAudio.mediaError,/Tiempo de espera agotado al leer el audio/);

  const stuckSeek=await timeoutInspector.inspect({id:'stuck-video',name:'stuck.mp4',type:'video',blob:new Blob(['x'])});
  assert.equal(stuckSeek.mediaReadable,false);
  assert.match(stuckSeek.mediaError,/Tiempo de espera agotado al buscar un fotograma del video/);
  assert.equal(revoked,3,'Cada object URL debe liberarse incluso cuando el decoder se queda colgado');
}finally{
  globalThis.URL=originalURL;
  globalThis.document=originalDocument;
  globalThis.Image=originalImage;
}

const qa=new ProfitMenteQAEngine();
const project={duration:5,format:'16:9',clips:[{id:'c1',name:'Toma dañada',track:0,start:0,duration:5,asset:'bad'}]};
const report=qa.inspect(project,[bad]);
assert.equal(report.ok,false);
assert(report.issues.some(x=>x.includes('Medio no decodificable')));

const hiddenReport=qa.inspect({...project,trackState:{0:{hidden:true}}},[bad]);
assert(!hiddenReport.issues.some(x=>x.includes('Medio no decodificable')),'Una pista visual oculta no debe bloquear el render');

const relinkAsset={id:'bad',name:'bad.mov',type:'video',mediaReadable:false,mediaError:'error',metadataVersion:2,duration:8,width:1920,height:1080,thumbnail:'data:x'};
const replacement=new Blob(['replacement'],{type:'video/mp4'});Object.defineProperty(replacement,'name',{value:'bad.mov'});
const relink=ProfitMenteMediaRelinkEngine.apply(relinkAsset,replacement);
assert.equal(relink.ok,true);
for(const key of ['mediaReadable','mediaError','metadataVersion','duration','width','height','thumbnail'])assert.equal(relinkAsset[key],undefined,`${key} debe invalidarse al reenlazar`);

console.log('media readability QA regression ok');
