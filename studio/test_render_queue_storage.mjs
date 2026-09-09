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

console.log('render queue storage tests: ok');
