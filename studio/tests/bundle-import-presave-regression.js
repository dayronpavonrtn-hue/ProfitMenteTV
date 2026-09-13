'use strict';

const assert=require('assert');

let baseParseCalls=0;
let flushCalls=0;
let allowFlush=true;

class MockImportEngine{
  constructor(defaults={}){this.defaults=defaults}
  normalize(value){return {...this.defaults,...structuredClone(value),normalized:true}}
}

class MockBundleEngine{
  async parse(blob){
    baseParseCalls++;
    return {project:{name:'Paquete',duration:12,format:'9:16',clips:[],blobMarker:blob?.marker},assets:[]};
  }
}

const input={accept:'',onchange:null};
global.document={
  readyState:'complete',
  querySelector(selector){return selector==='#projectInput'?input:null}
};
global.window=global;
global.ProfitMenteProjectImportEngine=MockImportEngine;
global.ProfitMenteBundleEngine=MockBundleEngine;
global.ProfitMenteProjectLibrary={blank:()=>({version:'1.8',mode:'Manual',fps:30})};
global.ProfitMenteNewProject={
  flushCurrentProject(){flushCalls++;return allowFlush}
};
global.addEventListener=()=>{};
global.dispatchEvent=()=>{};
global.CustomEvent=function(type,init){this.type=type;this.detail=init?.detail};

require('../project-import-integration.js');

(async()=>{
  assert.strictEqual(MockBundleEngine.__profitmenteProjectImportGuardInstalled,true,'bundle import guard should install');
  assert.strictEqual(global.ProfitMenteBundleProjectImportGuard?.preservesActiveProject,true,'guard should advertise active-project preservation');

  const engine=new MockBundleEngine();
  const restored=await engine.parse({marker:'ok'});
  assert.strictEqual(flushCalls,1,'bundle import must flush active project before parsing');
  assert.strictEqual(baseParseCalls,1,'bundle parser should run after a successful flush');
  assert.strictEqual(restored.project.normalized,true,'bundle project should still pass through import normalization');
  assert.strictEqual(restored.project.blobMarker,'ok','bundle parser result should be preserved');

  allowFlush=false;
  let rejected=null;
  try{await engine.parse({marker:'blocked'})}catch(err){rejected=err}
  assert(rejected,'bundle import must reject when the active project cannot be preserved');
  assert.match(String(rejected.message),/guardar el proyecto actual/i,'rejection should explain why package opening was cancelled');
  assert.strictEqual(flushCalls,2,'failed import should still attempt the active-project flush exactly once');
  assert.strictEqual(baseParseCalls,1,'bundle bytes must not be parsed after a failed active-project flush');

  console.log('bundle import active-project preservation regression: OK');
})().catch(err=>{
  console.error(err);
  process.exitCode=1;
});
