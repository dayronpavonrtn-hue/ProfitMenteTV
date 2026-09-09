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
