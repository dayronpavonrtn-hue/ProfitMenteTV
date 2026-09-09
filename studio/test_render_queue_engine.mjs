import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require=createRequire(import.meta.url);
const ProfitMenteRenderQueueEngine=require('./render-queue-engine.js');

let now=1000;
const snapshots=[];
const snapshotEngine={capture(project,assets){
  const snap={project:structuredClone(project),assets:structuredClone(assets)};
  snapshots.push(snap);
  return snap;
}};
const queue=new ProfitMenteRenderQueueEngine({snapshotEngine,now:()=>++now,idFactory:n=>`q-${n}`});

const projectA={name:'A',clips:[{id:1,start:0,duration:2}]};
const assetsA=[{id:1,name:'a.mp4'}];
const first=queue.enqueue(projectA,assetsA,{format:'mp4'});
projectA.name='MUTATED';
assetsA[0].name='mutated.mp4';
assert.equal(first.id,'q-1');
assert.equal(first.project.name,'A','queue must hold an immutable project snapshot');
assert.equal(first.assets[0].name,'a.mp4','queue must hold an immutable asset snapshot');
assert.equal(first.status,'pending');
assert.deepEqual(queue.summary(),{total:1,pending:1,running:0,done:0,error:0,cancelled:0,active:false});

const second=queue.enqueue({name:'B',clips:[]},[],{format:'webm'});
const seen=[];
const summary=await queue.run(async(item,signal,progress)=>{
  assert.equal(signal.aborted,false);
  seen.push(item.id);
  progress({percent:50});
  if(item.id==='q-2')throw new Error('render failed');
  return {size:123};
},{onUpdate:()=>{}});
assert.deepEqual(seen,['q-1','q-2']);
assert.equal(first.status,'done');
assert.deepEqual(first.result,{size:123});
assert.equal(first.progress.percent,50);
assert.equal(second.status,'error');
assert.equal(second.error,'render failed');
assert.equal(summary.done,1);
assert.equal(summary.error,1);
assert.equal(summary.active,false);

const persisted=queue.exportState();
assert.equal(persisted.version,1);
assert.equal(persisted.items.length,1,'completed outputs must not be persisted because their blob is gone after reload');
assert.equal(persisted.items[0].id,second.id);
assert.equal('result' in persisted.items[0],false,'render result/blob metadata must not be persisted');
assert.equal('progress' in persisted.items[0],false,'transient progress must not be persisted');
second.project.name='CHANGED AFTER EXPORT';
assert.equal(persisted.items[0].project.name,'B','exported recovery state must be an isolated snapshot');

const recovered=new ProfitMenteRenderQueueEngine({snapshotEngine,now:()=>5000,idFactory:n=>`r-${n}`});
assert.equal(recovered.restoreState(persisted),1);
assert.equal(recovered.items[0].status,'error');
assert.equal(recovered.items[0].project.name,'B');
assert.equal(recovered.items[0].result,null);
assert.equal(recovered.items[0].progress,null);
assert.equal(recovered.restoreState({version:999,items:[]}),0,'unsupported state versions must be ignored');
assert.equal(recovered.restoreState(null),0,'malformed state must be ignored');

const interruptedState={version:1,items:[{
  id:'was-running',name:'Interrupted',format:'mp4',status:'running',createdAt:10,startedAt:20,finishedAt:null,
  project:{name:'Interrupted',clips:[]},assets:[]
},{
  id:'still-pending',name:'Pending',format:'mp4',status:'pending',createdAt:11,startedAt:null,finishedAt:null,
  project:{name:'Pending',clips:[]},assets:[]
},{
  id:'already-done',name:'Done',format:'mp4',status:'done',createdAt:12,
  project:{name:'Done',clips:[]},assets:[]
}]};
const interruptedQueue=new ProfitMenteRenderQueueEngine({snapshotEngine,now:()=>6000});
assert.equal(interruptedQueue.restoreState(interruptedState),2,'done jobs must not be restored without their output blob');
assert.equal(interruptedQueue.get('was-running').status,'error');
assert.equal(interruptedQueue.get('was-running').error,ProfitMenteRenderQueueEngine.INTERRUPTED_ERROR);
assert.equal(interruptedQueue.get('was-running').finishedAt,6000);
assert.equal(interruptedQueue.get('still-pending').status,'pending');
assert.equal(interruptedQueue.get('already-done'),null);
assert.equal(interruptedQueue.retry('was-running'),true,'interrupted jobs must be manually retryable');
assert.equal(interruptedQueue.get('was-running').status,'pending');

assert.equal(queue.clearFinished(),2);
assert.equal(queue.summary().total,0);

const cancelQueue=new ProfitMenteRenderQueueEngine({snapshotEngine,idFactory:n=>`c-${n}`});
cancelQueue.enqueue({name:'C'},[]);
cancelQueue.enqueue({name:'D'},[]);
assert.equal(cancelQueue.cancel(),2,'cancel should mark all pending jobs');
assert.equal(cancelQueue.summary().cancelled,2);

const stopQueue=new ProfitMenteRenderQueueEngine({snapshotEngine,idFactory:n=>`s-${n}`});
const running=stopQueue.enqueue({name:'E'},[]);
stopQueue.enqueue({name:'F'},[]);
let entered=false;
const runPromise=stopQueue.run(async()=>{
  entered=true;
  stopQueue.cancel({cancelPending:false});
  await Promise.resolve();
  return {ignored:true};
});
await runPromise;
assert.equal(entered,true);
assert.equal(running.status,'cancelled');
assert.equal(stopQueue.pending().length,1,'cancelPending=false must preserve pending jobs');
assert.equal(stopQueue.remove(running.id),true,'finished jobs can be removed');

console.log('render queue engine tests: ok');
