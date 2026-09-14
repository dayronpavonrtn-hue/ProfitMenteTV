'use strict';

const assert=require('assert');

class MockBundleEngine{}
class MockImportEngine{}

const input={onclick:null,onchange:null,click(){}};
const button={onclick:null};

global.window=global;
global.document={
  scripts:[],
  body:{appendChild(){}},
  querySelector(selector){
    if(selector==='#bundleInput')return input;
    if(selector==='#importBundleBtn')return button;
    return null;
  },
  createElement(){return {addEventListener(){}}}
};
global.ProfitMenteBundleEngine=MockBundleEngine;
global.ProfitMenteBundleImportEngine=MockImportEngine;
global.project={version:'1.3',name:'Persistencia',mode:'Manual',duration:10,format:'9:16',clips:[]};

const data=new Map();
global.localStorage={
  setItem(key,value){data.set(String(key),String(value))},
  getItem(key){return data.has(String(key))?data.get(String(key)):null},
  removeItem(key){data.delete(String(key))}
};

global.persist=function(){
  try{localStorage.setItem('profitmente-project',JSON.stringify(project))}catch{}
};

require('../bundle-import-integration.js');

const api=global.ProfitMenteBundleImport;
assert(api?.persistActivatedProject,'safe bundle import should expose persistence verification');
assert(api?.verifyPersistedAssets,'safe bundle import should expose media persistence verification');

assert.strictEqual(api.persistActivatedProject(),true,'fallback persistence should verify a successful write without startup guard');
assert.strictEqual(localStorage.getItem('profitmente-project'),JSON.stringify(project),'fallback project key should contain the activated project');

const originalSet=localStorage.setItem;
localStorage.removeItem('profitmente-project');
localStorage.setItem=()=>{throw new Error('quota denied')};
assert.throws(
  ()=>api.persistActivatedProject(),
  /no quedó confirmado en el almacenamiento persistente/i,
  'a swallowed localStorage write failure must abort bundle activation'
);
localStorage.setItem=originalSet;

const originalGet=localStorage.getItem;
localStorage.getItem=()=>{throw new Error('storage blocked')};
assert.throws(
  ()=>api.persistActivatedProject(),
  /no se pudo verificar el proyecto restaurado/i,
  'an unreadable persistence layer must abort bundle activation'
);
localStorage.getItem=originalGet;

global.ProfitMenteStartupProjectGuard={
  PRIMARY_KEY:'profitmente-project-v2',
  serializeProject(value){return {raw:JSON.stringify({wrapped:true,project:value})}}
};
global.persist=function(){
  const guard=global.ProfitMenteStartupProjectGuard;
  localStorage.setItem(guard.PRIMARY_KEY,guard.serializeProject(project).raw);
};
assert.strictEqual(api.persistActivatedProject(),true,'startup guard persistence should continue to use its canonical key and serialization');
assert.strictEqual(localStorage.getItem('profitmente-project-v2'),global.ProfitMenteStartupProjectGuard.serializeProject(project).raw);

(async()=>{
  global.mediaStore={
    storageAvailable:true,
    lastError:null,
    async flush(){return true},
    backend:{async loadAll(){return [{id:'media-ok'},{id:'other'}]}}
  };
  assert.strictEqual(await api.verifyPersistedAssets([{id:'media-ok'}]),true,'persisted bundle media should pass verification');

  mediaStore.backend.loadAll=async()=>[];
  await assert.rejects(
    ()=>api.verifyPersistedAssets([{id:'media-missing'}]),
    /no quedaron confirmados en el almacenamiento persistente/i,
    'missing media after a nominal write must abort bundle activation'
  );

  mediaStore.storageAvailable=false;
  mediaStore.lastError=new Error('quota denied');
  mediaStore.flush=async()=>false;
  await assert.rejects(
    ()=>api.verifyPersistedAssets([{id:'media-quota'}]),
    /no quedaron confirmados en el almacenamiento persistente/i,
    'a failed media-store flush must abort bundle activation even when putAsset kept the media in memory'
  );

  assert.strictEqual(await api.verifyPersistedAssets([]),true,'bundles without new media should not require a persistence read');
  console.log('bundle import persistence verification regression: OK');
})().catch(error=>{console.error(error);process.exitCode=1});
