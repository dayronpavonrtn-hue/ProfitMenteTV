import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('./media-storage-resilience.js',import.meta.url),'utf8');

function makeContext({fail=false,initial=[],storage=null}={}){
  const calls={library:0,form:0,timeline:0,render:0,status:[],persist:0,persisted:0};
  const window={};
  const document={querySelector(){return {value:'0'}}};
  const navigator=storage?{storage:{
    async persisted(){calls.persisted++;return !!storage.persisted},
    async persist(){calls.persist++;return storage.granted!==false}
  }}:{};
  const context={
    window,document,navigator,
    console:{warn(){},error(){}},
    Map,Promise,setTimeout,clearTimeout,
    assets:[],
    async putAsset(asset){if(fail)throw new Error('IndexedDB blocked');initial.push(asset)},
    async getAssets(){if(fail)throw new Error('IndexedDB blocked');return initial.slice()},
    drawLibrary(){calls.library++},syncForm(){calls.form++},drawTimeline(){calls.timeline++},
    async renderAt(){calls.render++},setStatus(v){calls.status.push(v)}
  };
  vm.createContext(context);
  vm.runInContext(source,context);
  return {context,window,calls};
}

{
  const stored=[{id:'persisted',name:'Persisted'}];
  const {context,window,calls}=makeContext({initial:stored});
  await new Promise(r=>setTimeout(r,0));
  assert.equal(window.ProfitMenteMediaStorageResilience.degraded,false,'working IndexedDB stays persistent');
  assert.equal(context.assets.length,1,'startup reloads persistent media');
  await context.putAsset({id:'second',name:'Second'});
  assert.equal((await context.getAssets()).length,2,'normal storage path remains usable');
  assert.equal(window.ProfitMenteMediaStorageResilience.persistenceState,'unsupported','unsupported persistence API stays non-fatal');
  assert.ok(calls.library>0&&calls.timeline>0&&calls.render>0,'Studio UI is initialized after storage check');
}

{
  const stored=[{id:'protected',name:'Protected'}];
  const {window,calls}=makeContext({initial:stored,storage:{persisted:false,granted:true}});
  await new Promise(r=>setTimeout(r,0));
  const api=window.ProfitMenteMediaStorageResilience;
  assert.equal(api.persistenceState,'granted','Studio records persistent storage when the browser grants it');
  assert.equal(calls.persisted,1,'Studio checks existing persistence before requesting it');
  assert.equal(calls.persist,1,'Studio requests persistent origin storage exactly once when needed');
}

{
  const {window,calls}=makeContext({storage:{persisted:false,granted:false}});
  await new Promise(r=>setTimeout(r,0));
  const api=window.ProfitMenteMediaStorageResilience;
  assert.equal(api.persistenceState,'best-effort','browser denial keeps normal IndexedDB semantics without breaking Studio');
  assert.equal(calls.persist,1,'denied persistence is not retried in a startup loop');
  assert.equal(await api.requestPersistentStorage(),false,'manual retry reports denial safely');
}

{
  const {context,window,calls}=makeContext({fail:true});
  await new Promise(r=>setTimeout(r,0));
  const api=window.ProfitMenteMediaStorageResilience;
  assert.equal(api.degraded,true,'IndexedDB failure activates in-memory fallback');
  assert.equal(context.assets.length,0,'Studio still initializes with an empty library');
  const asset={id:'session-media',name:'Session media'};
  await context.putAsset(asset);
  const list=await context.getAssets();
  assert.equal(list.map(x=>x.id).join(','),'session-media','uploads remain usable during the degraded session');
  assert.equal(api.memoryCount(),1,'fallback keeps the media in memory');
  assert.equal(await api.resilientDelete('session-media'),true,'rollback can delete an in-memory asset while IndexedDB is degraded');
  assert.equal(api.memoryCount(),0,'rollback removes the failed-import asset from the temporary library');
  assert.equal((await context.getAssets()).map(x=>x.id).join(','),'','deleted fallback media no longer appears in the active library');
  assert.ok(calls.status.some(x=>x.includes('medios en memoria')),'user receives a concrete persistence warning');
  assert.ok(calls.library>0&&calls.form>0&&calls.timeline>0&&calls.render>0,'storage failure no longer blocks Studio initialization');
}

console.log('Media storage resilience OK');