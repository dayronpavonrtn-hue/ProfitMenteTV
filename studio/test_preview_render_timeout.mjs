import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {createCoordinator,finiteTimeout}=require('./preview-render-coordinator.js');

assert.equal(finiteTimeout(10),50);
assert.equal(finiteTimeout(125),125);
assert.equal(finiteTimeout('250'),250);

const rendered=[];
const coordinator=createCoordinator(async time=>{
  if(time===1)return new Promise(()=>{});
  rendered.push(time);
},{timeoutMs:60});

await assert.rejects(
  coordinator.request(1),
  error=>error?.code==='PREVIEW_RENDER_TIMEOUT'&&error?.timeoutMs===60&&error?.time===1
);

const afterTimeout=coordinator.snapshot();
assert.equal(afterTimeout.failed,1);
assert.equal(afterTimeout.timedOut,1);
assert.equal(afterTimeout.active,false);
assert.equal(afterTimeout.hasPending,false);

const result=await coordinator.request(2);
assert.equal(result.status,'rendered');
assert.equal(result.time,2);
assert.deepEqual(rendered,[2]);

const finalState=coordinator.snapshot();
assert.equal(finalState.requested,2);
assert.equal(finalState.rendered,1);
assert.equal(finalState.failed,1);
assert.equal(finalState.timedOut,1);
assert.equal(finalState.timeoutMs,60);
console.log('preview render timeout recovery ok');
