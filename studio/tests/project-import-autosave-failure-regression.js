'use strict';

const assert=require('assert');

let baseParseCalls=0;
let autosaveFlushCalls=0;
let persistCalls=0;
let status='';
let unsaved=true;
let flushResult=false;

class MockImportEngine{
  constructor(defaults={}){this.defaults=defaults}
  normalize(value){return {...this.defaults,...structuredClone(value),normalized:true}}
}

class MockBundleEngine{
  async parse(){
    baseParseCalls++;
    return {project:{name:'Paquete',duration:8,format:'9:16',clips:[]},assets:[]};
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
global.ProfitMenteProjectAutosave={
  flush(){autosaveFlushCalls++;return flushResult},
  get unsaved(){return unsaved}
};
global.persist=()=>{persistCalls++};
global.setStatus=value=>{status=value};
global.addEventListener=()=>{};
global.dispatchEvent=()=>{};
global.CustomEvent=function(type,init){this.type=type;this.detail=init?.detail};

delete global.ProfitMenteNewProject;
require('../project-import-integration.js');

(async()=>{
  const engine=new MockBundleEngine();

  let rejected=null;
  try{await engine.parse({})}catch(err){rejected=err}
  assert(rejected,'bundle import must reject when fallback autosave reports an unsaved write failure');
  assert.match(String(rejected.message),/guardar el proyecto actual/i);
  assert.strictEqual(autosaveFlushCalls,1,'fallback must attempt autosave exactly once');
  assert.strictEqual(persistCalls,0,'failed verified autosave must not be masked by a weaker persist fallback');
  assert.strictEqual(baseParseCalls,0,'bundle parsing must not start after failed project preservation');
  assert.match(status,/importación cancelada/i);

  unsaved=false;
  flushResult=false; // legitimate no-op: project already persisted
  status='';
  const restored=await engine.parse({});
  assert.strictEqual(autosaveFlushCalls,2,'no-op autosave should still be checked');
  assert.strictEqual(persistCalls,1,'safe no-op may use the full-project persistence fallback');
  assert.strictEqual(baseParseCalls,1,'bundle parsing should continue after a safe no-op autosave');
  assert.strictEqual(restored.project.normalized,true,'normalization must remain active after the preservation guard');
  assert.strictEqual(status,'');

  unsaved=true;
  flushResult=true; // defensive case: inconsistent autosave state must still block replacement
  let inconsistent=null;
  try{await engine.parse({})}catch(err){inconsistent=err}
  assert(inconsistent,'explicit unsaved state must block import even if flush returned true');
  assert.strictEqual(baseParseCalls,1,'inconsistent unsaved state must stop before bundle parsing');

  console.log('project import autosave failure regression: OK');
})().catch(err=>{
  console.error(err);
  process.exitCode=1;
});
