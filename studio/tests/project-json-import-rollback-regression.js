'use strict';

const assert=require('assert');

const input={accept:'',onchange:null,value:'chosen'};
const playhead={value:'7'};
let status='';
let project={name:'Current',duration:20,clips:[],libraryId:'current-project'};
const persisted=[];
const rendered=[];
const events=[];
let failImportedPreview=true;

class MockImportEngine{
  normalize(value){
    const next=structuredClone(value);
    delete next.libraryId;
    return next;
  }
}

global.document={
  readyState:'complete',
  querySelector(selector){
    if(selector==='#projectInput')return input;
    if(selector==='#playhead')return playhead;
    return null;
  }
};
global.window=global;
global.ProfitMenteProjectImportEngine=MockImportEngine;
global.project=project;
global.persist=()=>{persisted.push(global.project.name)};
global.drawTimeline=()=>{};
global.drawLibrary=()=>{};
global.syncForm=()=>{};
global.renderAt=async time=>{
  rendered.push([global.project.name,time]);
  if(failImportedPreview&&global.project.name==='Imported')throw new Error('preview failed after persist');
};
global.setStatus=value=>{status=value};
global.addEventListener=()=>{};
global.dispatchEvent=event=>{events.push(event)};
global.CustomEvent=function(type,init){this.type=type;this.detail=init?.detail};

delete global.ProfitMenteProjectTransfer;
delete global.ProfitMenteProjectAutosave;
delete global.ProfitMenteNewProject;

require('../project-import-integration.js');

function fileFor(value){
  const text=JSON.stringify(value);
  return {size:Buffer.byteLength(text),async text(){return text}};
}

(async()=>{
  assert.strictEqual(typeof input.onchange,'function','project import handler must be installed');
  assert.deepStrictEqual(global.ProfitMenteJsonProjectImportGuard,{enabled:true,transactionalFallback:true,restoresPersistedProject:true});

  await input.onchange({target:{files:[fileFor({name:'Imported',duration:12,clips:[],libraryId:'foreign'})],value:'chosen'}});

  assert.strictEqual(global.project.name,'Current','failed post-persist import must restore the previous in-memory project');
  assert.strictEqual(global.project.libraryId,'current-project','rollback must preserve the previous project identity');
  assert.deepStrictEqual(persisted.slice(-3),['Current','Imported','Current'],'rollback must repersist the previous project after the imported project was already written');
  assert.strictEqual(Number(playhead.value),7,'rollback must restore the previous playhead');
  assert(rendered.some(([name,time])=>name==='Imported'&&time===0),'import must reach preview before simulated failure');
  assert(rendered.some(([name,time])=>name==='Current'&&time===7),'rollback must restore the previous preview frame');
  assert.match(status,/proyecto anterior restaurado/i,'status must make the rollback visible to the user');
  assert.strictEqual(events.length,0,'failed import must not announce a project-opened event');

  failImportedPreview=false;
  playhead.value='4';
  await input.onchange({target:{files:[fileFor({name:'Imported OK',duration:9,clips:[],libraryId:'foreign-2'})],value:'chosen'}});

  assert.strictEqual(global.project.name,'Imported OK','successful fallback import must remain active');
  assert.strictEqual(global.project.libraryId,undefined,'imported JSON must remain a new copy without the foreign library identity');
  assert.strictEqual(Number(playhead.value),0,'successful import must start preview at zero');
  assert.strictEqual(events.length,1,'successful import must announce project-opened exactly once');
  assert.strictEqual(events[0].detail.name,'Imported OK');
  assert.match(status,/Proyecto JSON importado como copia nueva/i);

  console.log('project JSON import rollback regression: OK');
})().catch(err=>{
  console.error(err);
  process.exitCode=1;
});