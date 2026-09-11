import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {createCoordinator,finitePreviewTime}=require('./preview-render-coordinator.js');

const deferred=()=>{let resolve,reject;const promise=new Promise((res,rej)=>{resolve=res;reject=rej});return {promise,resolve,reject}};

{
  const gates=[],seen=[];
  const coordinator=createCoordinator(async time=>{seen.push(time);const gate=deferred();gates.push(gate);await gate.promise});
  const p1=coordinator.request(1);
  await Promise.resolve();
  const p2=coordinator.request(2);
  const p3=coordinator.request(3);
  assert.deepEqual(seen,[1],'first render should start immediately');
  const r2=await p2;
  assert.equal(r2.status,'superseded','intermediate scrub request should be coalesced');
  gates[0].resolve();
  await Promise.resolve();await Promise.resolve();
  assert.deepEqual(seen,[1,3],'latest request must render after active request');
  gates[1].resolve();
  const [r1,r3]=await Promise.all([p1,p3]);
  assert.equal(r1.status,'rendered');
  assert.equal(r3.status,'rendered');
  const stats=coordinator.snapshot();
  assert.equal(stats.requested,3);
  assert.equal(stats.rendered,2);
  assert.equal(stats.superseded,1);
  assert.equal(stats.invalidated,0);
}

{
  const gates=[],seen=[];
  let invalidations=0;
  const coordinator=createCoordinator(async time=>{seen.push(time);const gate=deferred();gates.push(gate);await gate.promise},{invalidate:()=>{invalidations++}});
  const p1=coordinator.request(11);
  await Promise.resolve();
  const p2=coordinator.request(12);
  assert.equal(invalidations,1,'new scrub request should invalidate the active preview frame');
  gates[0].resolve();
  const r1=await p1;
  assert.equal(r1.status,'superseded','invalidated active frame must not report itself as current');
  await Promise.resolve();await Promise.resolve();
  assert.deepEqual(seen,[11,12],'latest frame should render immediately after invalidated work unwinds');
  gates[1].resolve();
  const r2=await p2;
  assert.equal(r2.status,'rendered');
  const stats=coordinator.snapshot();
  assert.equal(stats.requested,2);
  assert.equal(stats.rendered,1);
  assert.equal(stats.superseded,1);
  assert.equal(stats.invalidated,1);
}

{
  const seen=[];
  const coordinator=createCoordinator(async time=>{seen.push(time)});
  for(const time of [10,20,30]){
    const result=await coordinator.request(time);
    assert.equal(result.status,'rendered');
  }
  assert.deepEqual(seen,[10,20,30],'awaited render/export frames must never be dropped');
}

{
  let calls=0;
  const coordinator=createCoordinator(async()=>{calls++;if(calls===1)throw new Error('decode failure')});
  await assert.rejects(coordinator.request(1),/decode failure/);
  const result=await coordinator.request(2);
  assert.equal(result.status,'rendered','coordinator must recover after render error');
  assert.equal(coordinator.snapshot().failed,1);
}

{
  const seen=[];
  const coordinator=createCoordinator(async time=>{seen.push(time)});
  const accepted=[' 2.5 ','1e1','+0','-0.25'];
  for(const value of accepted){
    const expected=Number(value);
    assert.equal(finitePreviewTime(value),expected);
    const result=await coordinator.request(value);
    assert.equal(result.status,'rendered');
  }
  assert.deepEqual(seen,accepted.map(Number),'numeric strings persisted by legacy projects must remain compatible');
}

{
  const coordinator=createCoordinator(async()=>{throw new Error('invalid preview time must never reach renderer')});
  for(const value of [Number.NaN,Infinity,-Infinity,true,false,null,undefined,'','   ',[],[1],{}, {valueOf(){return 1}}]){
    assert.equal(finitePreviewTime(value),null);
    await assert.rejects(coordinator.request(value),/finite numeric scalar/);
  }
  assert.equal(coordinator.snapshot().requested,0,'rejected values must not alter coordinator request statistics');
}

console.log('Preview render coordinator regression: OK');