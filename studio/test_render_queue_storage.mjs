import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const ProfitMenteRenderQueueStorageEngine=require('./render-queue-storage-engine.js');

const memory=new Map();
const localStorageRef={
  setItem(key,value){memory.set(key,String(value))},
  getItem(key){return memory.has(key)?memory.get(key):null},
  removeItem(key){memory.delete(key)}
};
const storage=new ProfitMenteRenderQueueStorageEngine({indexedDBFactory:null,localStorageRef,key:'queue-test'});
const plain={version:1,items:[{id:'a',project:{name:'A'},assets:[{id:'meta'}]}]};
assert.equal(storage.hasBinary(plain),false);
assert.equal(await storage.save(plain),true,'plain recovery state may use JSON fallback');
assert.deepEqual(await storage.load(),plain);
await storage.clear();
assert.equal(await storage.load(),null);

const withBlob={version:1,items:[{id:'b',project:{name:'B'},assets:[{id:'video',blob:new Blob(['media'],{type:'video/mp4'})}]}]};
assert.equal(storage.hasBinary(withBlob),true,'Blob/File media must be recognized as binary');
assert.equal(await storage.save(withBlob),false,'binary media must never be silently JSON-stringified because that loses render bytes');
assert.equal(memory.has('queue-test'),false,'failed binary fallback must not leave a corrupt recovery snapshot');

const failingIndexedDB={open(){throw new Error('blocked')}};
const degraded=new ProfitMenteRenderQueueStorageEngine({indexedDBFactory:failingIndexedDB,localStorageRef,key:'queue-degraded'});
assert.equal(await degraded.save(plain),true,'plain queue state must fall back when IndexedDB cannot open');
assert.deepEqual(await degraded.load(),plain,'fallback snapshot must remain readable while IndexedDB is unavailable');
assert.equal(await degraded.save(withBlob),false,'binary state must still refuse lossy fallback when IndexedDB is unavailable');
await degraded.clear();
assert.equal(memory.has('queue-degraded'),false,'clear must remove fallback even when IndexedDB cannot open');

memory.set('queue-stale',JSON.stringify(plain));
const emptyDb={
  objectStoreNames:{contains(){return true}},
  transaction(){
    return {objectStore(){return {get(){const request={};queueMicrotask(()=>{request.result=undefined;request.onsuccess?.()});return request}}}};
  },
  close(){}
};
const emptyIndexedDB={open(){const request={result:emptyDb};queueMicrotask(()=>request.onsuccess?.());return request}};
const recoverFallback=new ProfitMenteRenderQueueStorageEngine({indexedDBFactory:emptyIndexedDB,localStorageRef,key:'queue-stale'});
assert.deepEqual(await recoverFallback.load(),plain,'a temporarily written fallback must be read when IndexedDB later returns no queue state');

console.log('render queue storage tests: ok');
