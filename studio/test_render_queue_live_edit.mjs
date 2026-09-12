import assert from 'node:assert/strict';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const ProfitMenteRenderQueueEngine=require('./render-queue-engine.js');

let seq=0;
const queue=new ProfitMenteRenderQueueEngine({
  snapshotEngine:{capture(project,assets){return {project:structuredClone(project),assets:structuredClone(assets)}}},
  now:()=>1000+(++seq),
  idFactory:n=>`live-${n}`
});

const active=queue.enqueue({name:'Active'},[]);
const p1=queue.enqueue({name:'P1'},[]);
const p2=queue.enqueue({name:'P2'},[]);
const failed=queue.enqueue({name:'Retry me'},[]);
failed.status='error';
failed.error='old failure';
failed.finishedAt=999;

let releaseActive;
const activeGate=new Promise(resolve=>{releaseActive=resolve});
const started=[];
let activeStarted;
const activeStartedPromise=new Promise(resolve=>{activeStarted=resolve});

const runPromise=queue.run(async item=>{
  started.push(item.project.name);
  if(item.id===active.id){
    activeStarted();
    await activeGate;
  }
  return {ok:true};
});

await activeStartedPromise;
assert.equal(queue.running,true,'queue must report an active render');
assert.equal(active.status,'running');
assert.equal(queue.remove(active.id),false,'the active render must remain protected');

const added=queue.enqueue({name:'Added live'},[]);
assert.equal(added.status,'pending','new snapshots must be accepted while another render is active');
assert.equal(queue.movePending(p2.id,-1),true,'pending priority must remain editable during an active render');
assert.deepEqual(queue.pending().map(item=>item.project.name),['P2','P1','Added live']);
assert.equal(queue.retry(failed.id),true,'failed work must be retryable while another render is active');
assert.equal(failed.status,'pending');
assert.equal(failed.error,null);
assert.equal(queue.remove(p1.id),true,'a pending job must be removable while another render is active');
assert.equal(queue.get(p1.id),null);

releaseActive();
const summary=await runPromise;
assert.deepEqual(started,['Active','P2','Added live','Retry me'],'live edits must affect the remaining processing order without interrupting the active render');
assert.equal(summary.done,4);
assert.equal(summary.pending,0);
assert.equal(summary.error,0);
assert.equal(summary.active,false);

const retryAllQueue=new ProfitMenteRenderQueueEngine({idFactory:n=>`retry-${n}`});
const current=retryAllQueue.enqueue({name:'Current'},[]);
const errorA=retryAllQueue.enqueue({name:'Error A'},[]);errorA.status='error';errorA.error='A';
const errorB=retryAllQueue.enqueue({name:'Error B'},[]);errorB.status='error';errorB.error='B';
let releaseCurrent;
const currentGate=new Promise(resolve=>{releaseCurrent=resolve});
let notifyCurrent;
const currentStarted=new Promise(resolve=>{notifyCurrent=resolve});
const secondRun=retryAllQueue.run(async item=>{if(item.id===current.id){notifyCurrent();await currentGate}return {ok:true}});
await currentStarted;
assert.equal(retryAllQueue.retryFailed(),2,'bulk retry must work while a different item is rendering');
releaseCurrent();
await secondRun;
assert.equal(retryAllQueue.summary().done,3);

console.log('render queue live edit tests: ok');
