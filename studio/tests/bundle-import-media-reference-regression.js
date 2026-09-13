'use strict';

const assert=require('assert');

let nextRestored=null;
let flushCalls=0;

class MockImportEngine{
  constructor(defaults={}){this.defaults=defaults}
  normalize(value){return {...this.defaults,...structuredClone(value),normalized:true}}
}

class MockBundleEngine{
  async parse(){
    return {
      project:structuredClone(nextRestored.project),
      assets:(nextRestored.assets||[]).map(asset=>({...asset}))
    };
  }
}

class MockProjectLibrary{
  static blank(){return {version:'1.8',mode:'Manual',fps:30}}
  load(){return null}
  save(value){return value}
}

const input={accept:'',onchange:null};
global.document={
  readyState:'complete',
  querySelector(selector){return selector==='#projectInput'?input:null}
};
global.window=global;
global.ProfitMenteProjectImportEngine=MockImportEngine;
global.ProfitMenteBundleEngine=MockBundleEngine;
global.ProfitMenteProjectLibrary=MockProjectLibrary;
global.ProfitMenteNewProject={flushCurrentProject(){flushCalls++;return true}};
global.addEventListener=()=>{};
global.dispatchEvent=()=>{};
global.CustomEvent=function(type,init){this.type=type;this.detail=init?.detail};

require('../project-import-integration.js');

const mediaBlob=()=>({arrayBuffer:async()=>new ArrayBuffer(4)});
const restored=(projectAssets,assets,clips=[])=>({
  project:{name:'Paquete',duration:12,format:'9:16',assets:projectAssets,clips},
  assets
});

async function rejectWith(engine,value,pattern){
  nextRestored=value;
  let rejected=null;
  try{await engine.parse({})}catch(err){rejected=err}
  assert(rejected,'bundle should be rejected');
  assert.match(String(rejected.message),pattern);
}

(async()=>{
  assert.strictEqual(MockBundleEngine.__profitmenteProjectImportGuardInstalled,true,'bundle import guard should install');
  assert.strictEqual(global.ProfitMenteBundleProjectImportGuard?.validatesMediaReferences,true,'guard should advertise media-reference validation');

  const engine=new MockBundleEngine();

  nextRestored=restored(
    [{id:'media-1',name:'media-1-video.mp4',type:'video'}],
    [{id:'media-1',name:'video.mp4',type:'video',blob:mediaBlob()}],
    [{id:'clip-1',asset:'media-1',start:0,duration:3,track:0,type:'video'}]
  );
  let valid=await engine.parse({});
  assert.strictEqual(valid.project.clips[0].asset,'media-1','valid media reference should survive import');

  nextRestored=restored(
    [{id:7,name:'7-audio.wav',type:'audio'}],
    [{id:'7',name:'audio.wav',type:'audio',blob:mediaBlob()}],
    [{id:'clip-numeric',asset:7,start:0,duration:1,track:1,type:'audio'}]
  );
  valid=await engine.parse({});
  assert.strictEqual(valid.project.assets[0].id,'7','numeric manifest media IDs should canonicalize to strings');
  assert.strictEqual(valid.assets[0].id,'7','restored media IDs should use the same canonical identity');
  assert.strictEqual(valid.project.clips[0].asset,'7','numeric legacy media IDs should canonicalize to strings');

  await rejectWith(engine,restored(
    [{id:'media-1',name:'media-1-video.mp4',type:'video'}],
    [{id:'media-1',name:'video.mp4',type:'video',blob:mediaBlob()}],
    [{id:'clip-missing',asset:'missing-media',start:0,duration:1,track:0,type:'video'}]
  ),/Clip referencia un medio no incluido/i);

  await rejectWith(engine,restored(
    [{id:'media-1',name:'media-1-video.mp4',type:'video'}],
    [],[]
  ),/Medio declarado pero no restaurado/i);

  await rejectWith(engine,restored(
    [{id:' media-1 ',name:'a.mp4',type:'video'},{id:'media-1',name:'b.mp4',type:'video'}],
    [{id:'media-1',name:'a.mp4',type:'video',blob:mediaBlob()}],[]
  ),/identificador de medio duplicado/i);

  await rejectWith(engine,restored(
    [],
    [{id:'orphan',name:'orphan.mp4',type:'video',blob:mediaBlob()}],[]
  ),/Medio restaurado no declarado/i);

  await rejectWith(engine,restored(
    [{id:'media-1',name:'media-1-video.mp4',type:'video'}],
    [{id:'media-1',name:'video.mp4',type:'video',blob:{}}],[]
  ),/Archivo de medio no disponible/i);

  assert.strictEqual(flushCalls,7,'every package open attempt should preserve the active project first');
  console.log('bundle import media-reference integrity regression: OK');
})().catch(err=>{
  console.error(err);
  process.exitCode=1;
});
