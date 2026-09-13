'use strict';

const assert=require('assert');

const controls={
  '#projectName':{value:'Proyecto A editado',addEventListener(){}},
  '#duration':{value:'45',addEventListener(){}},
  '#format':{value:'9:16',addEventListener(){}},
  '#mode':{value:'Manual',addEventListener(){}},
  '#playhead':{value:'0'},
  '.projectLibrary':null
};

const persistedLibrary=[{
  id:'project-a',
  name:'Proyecto A',
  createdAt:'2026-09-13T12:00:00.000Z',
  updatedAt:'2026-09-13T12:00:00.000Z',
  project:{libraryId:'project-a',name:'Proyecto A',duration:45,format:'9:16',mode:'Manual',clips:[]}
}];
const primaryKey='profitmente-project';
const libraryKey='profitmente-project-library';
let primaryRaw=null;
let rejectLibraryWrite=true;
let scheduled=0;
const events=[];

global.window=global;
global.project={libraryId:'project-a',name:'Proyecto A',duration:45,format:'9:16',mode:'Manual',clips:[]};
global.document={
  documentElement:{dataset:{}},
  querySelector(selector){return controls[selector]??null}
};
global.CustomEvent=function(type,init){this.type=type;this.detail=init?.detail};
global.dispatchEvent=event=>events.push(event);
global.addEventListener=()=>{};
global.setStatus=()=>{};
global.setTimeout=()=>++scheduled;
global.clearTimeout=()=>{};
global.localStorage={
  getItem(key){
    if(key===primaryKey)return primaryRaw;
    if(key===libraryKey)return JSON.stringify(persistedLibrary);
    return null;
  },
  setItem(key,value){
    if(key===primaryKey){primaryRaw=String(value);return}
    if(key===libraryKey&&rejectLibraryWrite)throw new Error('QuotaExceededError');
  }
};
global.ProfitMenteStartupProjectGuard={
  PRIMARY_KEY:primaryKey,
  serializeProject(value){return {raw:JSON.stringify(value)}}
};

global.profitMenteProjectLibrary={key:libraryKey,storageAvailable:false};
global.persist=()=>{
  primaryRaw=JSON.stringify(global.project);
  // Simula project-library.js: el snapshot principal se guarda, pero la escritura
  // del registro de Mis proyectos falla y queda solamente en memoria.
  global.profitMenteProjectLibrary.storageAvailable=!rejectLibraryWrite;
  if(!rejectLibraryWrite){
    persistedLibrary[0].project=structuredClone(global.project);
    persistedLibrary[0].name=global.project.name;
  }
};

const {ProfitMenteProjectAutosaveEngine}=require('../project-autosave.js');
global.ProfitMenteProjectAutosaveEngine=ProfitMenteProjectAutosaveEngine;
delete require.cache[require.resolve('../project-autosave.js')];
require('../project-autosave.js');

assert(global.ProfitMenteProjectAutosave,'autosave integration must initialize');

let transitionError=null;
try{
  global.ProfitMenteProjectAutosave.flush('cambio de proyecto');
}catch(err){transitionError=err}
assert(transitionError,'switch must be blocked when Mis proyectos is not durably updated');
assert.match(String(transitionError.message),/Mis proyectos|biblioteca persistente/i);
assert.strictEqual(global.ProfitMenteProjectAutosave.unsaved,true,'failed library durability must keep project marked unsaved');
assert.strictEqual(persistedLibrary[0].project.name,'Proyecto A','stale durable library row must remain detectable');
assert(events.some(event=>event.type==='profitmente:project-autosave-error'),'library durability failure must emit autosave error');

rejectLibraryWrite=false;
controls['#projectName'].value='Proyecto A editado';
const retryResult=global.ProfitMenteProjectAutosave.flush('cambio de proyecto');
assert.strictEqual(retryResult,true,'transition save should succeed after durable library storage recovers');
assert.strictEqual(global.ProfitMenteProjectAutosave.unsaved,false);
assert.strictEqual(persistedLibrary[0].project.name,'Proyecto A editado','durable library row must contain latest edit before switch');
assert.strictEqual(primaryRaw,JSON.stringify(global.project),'primary snapshot must still match the active project');

console.log('project library durability transition regression: OK');