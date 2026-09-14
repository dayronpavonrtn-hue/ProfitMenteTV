import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const source=fs.readFileSync(path.join(here,'..','render-job-integration.js'),'utf8');

function boot({storedProject,unsaved=false,lastError=null,saveImpl=()=>{}}={}){
  const renderBtn={disabled:false,insertAdjacentElement(){},onclick:null};
  let status='';
  const localStorage={
    getItem(key){return key==='profitmente-project'?storedProject??null:null},
    setItem(){},removeItem(){}
  };
  class Client{
    constructor(){this.jobId=null;this.resultMaxAttempts=3}
    reset(){} attach(){} async status(){return {status:'idle'}} async cancel(){}
  }
  const context={
    console,
    structuredClone,
    Blob,
    URL,
    document:{
      querySelector(selector){return selector==='#renderMp4Btn'?renderBtn:null},
      createElement(){return {hidden:true,disabled:false,insertAdjacentElement(){}}}
    },
    ProfitMenteRenderJobClient:Client,
    project:{version:'1.3',name:'Persisted project',duration:12,format:'9:16',mode:'Manual',clips:[]},
    assets:[],
    save:saveImpl,
    setStatus(value){status=String(value)},
    localStorage,
    setTimeout(){return 0},clearTimeout(){},
    qa:{inspect(){return {issues:[]}}},
    bundler:{health:async()=>({ok:true,render_ready:true})}
  };
  context.window=context;
  context.ProfitMenteStartupProjectGuard={
    PRIMARY_KEY:'profitmente-project',
    serializeProject(value){return {raw:JSON.stringify(value)}}
  };
  context.ProfitMenteProjectAutosave={unsaved,lastError};
  vm.createContext(context);
  vm.runInContext(source,context,{filename:'render-job-integration.js'});
  return {context,renderBtn,get status(){return status}};
}

{
  const project={version:'1.3',name:'Persisted project',duration:12,format:'9:16',mode:'Manual',clips:[]};
  const env=boot({storedProject:JSON.stringify(project)});
  assert.equal(env.context.ProfitMenteAsyncRenderValidation.verifyProjectPersistence(env.context.project),true);
}

{
  const env=boot({storedProject:'{"stale":true}'});
  assert.throws(
    ()=>env.context.ProfitMenteAsyncRenderValidation.verifyProjectPersistence(env.context.project),
    /no llegó al almacenamiento persistente/
  );
}

{
  const project={version:'1.3',name:'Persisted project',duration:12,format:'9:16',mode:'Manual',clips:[]};
  const env=boot({storedProject:JSON.stringify(project),unsaved:true,lastError:new Error('storage quota')});
  assert.throws(
    ()=>env.context.ProfitMenteAsyncRenderValidation.verifyProjectPersistence(env.context.project),
    /storage quota/
  );
}

{
  const project={version:'1.3',name:'Persisted project',duration:12,format:'9:16',mode:'Manual',clips:[]};
  const env=boot({storedProject:JSON.stringify(project),saveImpl:()=>{throw new Error('disk unavailable')}});
  await env.renderBtn.onclick();
  assert.match(env.status,/Render MP4 cancelado: no se pudo confirmar el guardado del proyecto/);
  assert.match(env.status,/disk unavailable/);
}

{
  const project={version:'1.3',name:'Persisted project',duration:12,format:'9:16',mode:'Manual',clips:[]};
  const env=boot({storedProject:JSON.stringify(project),saveImpl:()=>Promise.reject(new Error('async save failed'))});
  await env.renderBtn.onclick();
  assert.match(env.status,/Render MP4 cancelado/);
  assert.match(env.status,/async save failed/);
}

console.log('MP4 persistence safety regression passed');
