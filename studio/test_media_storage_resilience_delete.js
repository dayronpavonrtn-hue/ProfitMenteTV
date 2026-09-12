'use strict';
const assert=require('assert');
const fs=require('fs');
const vm=require('vm');

(async()=>{
  const deleted=[];
  const context={
    console,
    Map,
    Promise,
    setTimeout,
    clearTimeout,
    putAsset:async asset=>asset,
    getAssets:async()=>[],
    mediaStore:{delete:async id=>{deleted.push(id);return true}},
    db:()=>{throw new Error('direct IndexedDB fallback should not run when MediaStore exists')},
    STORE:'media',
    assets:[],
    drawLibrary:()=>{},
    syncForm:()=>{},
    drawTimeline:()=>{},
    renderAt:async()=>{},
    setStatus:()=>{},
    navigator:{storage:{}},
    document:{
      querySelector:()=>null,
      createElement:()=>({dataset:{}}),
      body:{appendChild:()=>{}}
    },
    ProfitMenteMediaMetadataEngine:function(){}
  };
  context.window=context;
  context.globalThis=context;

  const source=fs.readFileSync(__dirname+'/media-storage-resilience.js','utf8');
  vm.runInNewContext(source,context,{filename:'media-storage-resilience.js'});
  await new Promise(resolve=>setTimeout(resolve,0));

  const api=context.ProfitMenteMediaStorageResilience;
  assert.ok(api,'resilience API should install');
  await api.resilientPut({id:'ghost-asset',name:'ghost.mp4'});
  assert.strictEqual(api.memoryCount(),1,'session fallback mirror should remember persisted assets');

  const removed=await api.resilientDelete('ghost-asset');
  assert.strictEqual(removed,true);
  assert.deepStrictEqual(deleted,['ghost-asset'],'delete must flow through ProfitMenteMediaStore');
  assert.strictEqual(api.memoryCount(),0,'rollback must remove the resilience memory mirror too');

  console.log('media storage rollback cache regression: ok');
})().catch(err=>{console.error(err);process.exitCode=1});
