import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const Storage=require('../render-queue-storage-engine.js');

function memoryStorage(){
  const values=new Map();
  return {
    setItem(key,value){values.set(String(key),String(value))},
    getItem(key){return values.has(String(key))?values.get(String(key)):null},
    removeItem(key){values.delete(String(key))},
    raw(key){return values.get(String(key))??null},
    force(key,value){values.set(String(key),String(value))}
  };
}

const local=memoryStorage();
const storage=new Storage({indexedDBFactory:null,localStorageRef:local,key:'queue'});
const state={version:1,savedAt:123,items:[{id:'r1',status:'pending',project:{name:'demo'},assets:[]}]};

assert.equal(storage.saveFallback(state),true,'JSON-safe queue should persist');
assert.deepEqual(storage.loadFallback(),state,'valid integrity envelope should round-trip');

const envelope=JSON.parse(local.raw('queue'));
assert.equal(envelope.v,1);
assert.equal(typeof envelope.checksum,'string');
assert.equal(typeof envelope.payload,'string');

envelope.payload=envelope.payload.replace('pending','running');
local.force('queue',JSON.stringify(envelope));
assert.equal(storage.loadFallback(),null,'tampered payload must not restore');

local.force('queue','{"broken":');
assert.equal(storage.loadFallback(),null,'truncated JSON must not restore');

// States saved by older Studio versions remain readable.
local.force('queue',JSON.stringify(state));
assert.deepEqual(storage.loadFallback(),state,'legacy plain JSON queue remains readable');

// Detect storage implementations that silently fail to persist the requested bytes.
const lyingStorage={setItem(){},getItem(){return null},removeItem(){}};
const lying=new Storage({indexedDBFactory:null,localStorageRef:lyingStorage,key:'queue'});
assert.equal(lying.saveFallback(state),false,'non-durable fallback write must report failure');

console.log('render queue fallback integrity regression: ok');
