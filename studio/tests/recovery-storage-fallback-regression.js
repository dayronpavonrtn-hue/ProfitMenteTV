'use strict';

const assert=require('node:assert/strict');
const {ProfitMenteRecoveryEngine}=require('../recovery-engine.js');

let raw=null;
let failWrites=true;
let failRemoves=false;
const storage={
  getItem(){return raw},
  setItem(_key,value){
    if(failWrites){const error=new Error('Quota exceeded');error.name='QuotaExceededError';throw error}
    raw=value;
  },
  removeItem(){
    if(failRemoves){const error=new Error('Storage blocked');error.name='SecurityError';throw error}
    raw=null;
  }
};

const engine=new ProfitMenteRecoveryEngine(storage,{limit:6});
const project={name:'Recuperación $0',clips:[{id:'clip-1',start:0,duration:3}]};

assert.doesNotThrow(()=>engine.capture(project,'autoguardado','2026-09-13T00:00:00.000Z'));
assert.equal(engine.storageAvailable,false,'failed durable write must be observable without throwing');
assert.equal(engine.memoryDirty,true,'failed durable write must keep a pending in-memory recovery set');
assert.equal(engine.list(project).length,1,'snapshot must remain recoverable during the session');
assert.equal(raw,null,'failed localStorage write must not pretend to persist data');

project.clips[0].duration=4;
assert.doesNotThrow(()=>engine.capture(project,'autoguardado','2026-09-13T00:00:01.000Z'));
assert.equal(engine.list(project).length,2,'multiple checkpoints must survive while localStorage is unavailable');

failWrites=false;
assert.doesNotThrow(()=>engine.capture(project,'autoguardado','2026-09-13T00:00:02.000Z'));
assert.equal(engine.storageAvailable,true,'the engine must recover when localStorage becomes writable again');
assert.equal(engine.memoryDirty,false,'successful retry must clear the pending-memory flag');
assert.equal(JSON.parse(raw).length,2,'the in-memory checkpoints must flush to durable storage after recovery');

const latest=engine.latest(project);
failWrites=true;
assert.doesNotThrow(()=>engine.remove(latest.id),'removing a checkpoint must not break editing when persistence fails');
assert.equal(engine.list(project).length,1,'remove must update the session fallback immediately');

failRemoves=true;
assert.doesNotThrow(()=>engine.clear(),'clearing recovery must tolerate blocked storage');
assert.equal(engine.list().length,0,'clear must still clear session recovery state');
assert.equal(engine.storageAvailable,false);
assert.equal(engine.memoryDirty,true);

console.log('recovery storage fallback regression: ok');
