import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {ProfitMenteMediaStore}=require('./media-store.js');

class Backend{
  constructor(items=[]){this.items=items.slice();this.failLoad=false;this.failWrite=false}
  async loadAll(){if(this.failLoad)throw new Error('read denied');return this.items.slice()}
  async putMany(incoming){if(this.failWrite)throw new Error('quota exceeded');const byId=new Map(this.items.map(x=>[String(x.id),x]));for(const x of incoming)byId.set(String(x.id),x);this.items=[...byId.values()]}
  async deleteMany(ids){const gone=new Set(ids.map(String));this.items=this.items.filter(x=>!gone.has(String(x.id)))}
}

const backend=new Backend([{id:'seed',name:'Inicial',type:'image'}]);
const store=new ProfitMenteMediaStore(backend);
await store.loadAll();
assert.equal(store.get('seed')?.name,'Inicial');

// Advanced media import commits directly through an IndexedDB transaction.
// The active store must adopt that committed record without a page reload.
backend.items.push({id:'atomic-import',name:'Importado',type:'video'});
const refreshed=await store.refreshFromBackend();
assert.equal(store.get('atomic-import')?.name,'Importado','externally committed import must become visible in the active media cache');
assert.deepEqual(new Set(refreshed.map(x=>x.id)),new Set(['seed','atomic-import']));
assert.equal(store.storageAvailable,true);

// A failed local write is authoritative for the current session. A refresh must
// not replace it with an older persistent snapshot or silently discard dirty work.
backend.failWrite=true;
await store.put({id:'pending',name:'Pendiente',type:'audio'});
assert.equal(store.dirty.has('pending'),true);
await store.refreshFromBackend();
assert.equal(store.get('pending')?.name,'Pendiente','refresh must preserve unsynced session media when persistence is unavailable');
assert.equal(store.dirty.has('pending'),true);
assert.equal(store.storageAvailable,false);

backend.failWrite=false;
await store.refreshFromBackend();
assert.equal(store.dirty.size,0,'refresh retries queued writes before accepting the persistent snapshot');
assert.equal(store.get('pending')?.name,'Pendiente');
assert.ok(backend.items.some(x=>x.id==='pending'));

backend.failLoad=true;
const before=store.values();
const after=await store.refreshFromBackend();
assert.deepEqual(after,before,'a failed refresh keeps the usable in-session cache intact');
assert.equal(store.storageAvailable,false);
backend.failLoad=false;
await store.refreshFromBackend();
assert.equal(store.storageAvailable,true);

const syncSource=fs.readFileSync(new URL('./media-store-import-sync.js',import.meta.url),'utf8');
const bootstrap=fs.readFileSync(new URL('./feature-bootstrap.js',import.meta.url),'utf8');
assert.match(syncSource,/profitmente:media-imported/,'import completion event must trigger media-store synchronization');
assert.match(syncSource,/refreshFromBackend/,'sync integration must use the guarded refresh API');
assert.match(bootstrap,/media-store-import-sync\.js/,'Studio feature bootstrap must load the media-store import synchronizer');
assert.ok(bootstrap.indexOf('media-import-engine.js')<bootstrap.indexOf('media-store-import-sync.js'),'synchronizer must load after the importer that emits the completion event');

console.log('Studio atomic media import -> active MediaStore synchronization + dirty-state protection OK');
