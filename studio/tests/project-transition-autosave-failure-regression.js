'use strict';

const assert=require('assert');

const controls={
  '#projectName':{value:'Cambio sin guardar',addEventListener(){}},
  '#duration':{value:'45',addEventListener(){}},
  '#format':{value:'9:16',addEventListener(){}},
  '#mode':{value:'Manual',addEventListener(){}},
  '#playhead':{value:'0'}
};

const events=[];
let scheduled=0;

global.window=global;
global.project={name:'Proyecto protegido',duration:45,format:'9:16',mode:'Manual'};
global.document={
  documentElement:{dataset:{}},
  querySelector(selector){return controls[selector]||null}
};
global.CustomEvent=function(type,init){this.type=type;this.detail=init?.detail};
global.dispatchEvent=event=>events.push(event);
global.addEventListener=()=>{};
global.setStatus=()=>{};
global.setTimeout=()=>++scheduled;
global.clearTimeout=()=>{};
global.localStorage={
  getItem(){return JSON.stringify({name:'Proyecto anterior'})},
  setItem(){}
};
global.persist=()=>{}; // Simula un persist() que atrapa internamente el fallo del navegador.
global.ProfitMenteStartupProjectGuard={
  PRIMARY_KEY:'profitmente-project',
  serializeProject(value){return {raw:JSON.stringify(value)}}
};

const {ProfitMenteProjectAutosaveEngine}=require('../project-autosave.js');
global.ProfitMenteProjectAutosaveEngine=ProfitMenteProjectAutosaveEngine;
// El require anterior carga el motor antes de que la asignación global pueda alimentar la IIFE.
delete require.cache[require.resolve('../project-autosave.js')];
require('../project-autosave.js');

assert(global.ProfitMenteProjectAutosave,'autosave integration must initialize');

let transitionError=null;
try{
  global.ProfitMenteProjectAutosave.flush('cambio de proyecto');
}catch(err){
  transitionError=err;
}
assert(transitionError,'project transition must throw when durable persistence verification fails');
assert.match(String(transitionError.message),/almacenamiento persistente/i);
assert.strictEqual(global.ProfitMenteProjectAutosave.unsaved,true,'failed transition save must remain marked unsaved');
assert(events.some(event=>event.type==='profitmente:project-autosave-error'),'failure event must still be emitted');

const manualResult=global.ProfitMenteProjectAutosave.flush('manual');
assert.strictEqual(manualResult,false,'ordinary autosave failure should preserve the non-throwing API');
assert.strictEqual(global.ProfitMenteProjectAutosave.unsaved,true);
assert(scheduled>=1,'failed saves should retain retry scheduling');

console.log('project transition autosave failure regression: OK');
