import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const Queue=require('./render-queue-engine.js');

let now=1000;
const snapshotEngine={capture(project,assets){return {project:structuredClone(project),assets:structuredClone(assets)}}};
const queue=new Queue({snapshotEngine,now:()=>++now,idFactory:n=>`q${n}`});

const a=queue.enqueue({name:'A',clips:[{id:'a'}]},[],{});
const b=queue.enqueue({name:'B',clips:[{id:'b'}]},[],{});
const c=queue.enqueue({name:'C',clips:[{id:'c'}]},[],{});
assert.deepEqual(queue.pending().map(x=>x.name),['A','B','C']);
assert.equal(queue.movePending(c.id,-1),true);
assert.deepEqual(queue.pending().map(x=>x.name),['A','C','B']);
assert.equal(queue.movePending(a.id,-1),false);
assert.equal(queue.movePending(b.id,1),false);

b.status='error';b.error='boom';b.finishedAt=99;b.result={bad:true};b.progress={progress:40};
assert.equal(queue.retry(b.id),true);
assert.equal(b.status,'pending');
assert.equal(b.error,null);assert.equal(b.finishedAt,null);assert.equal(b.result,null);assert.equal(b.progress,null);

c.status='cancelled';c.finishedAt=88;
assert.equal(queue.retry(c.id),true);
assert.equal(c.status,'pending');

a.status='error';a.error='x';
c.status='error';c.error='y';
assert.equal(queue.retryFailed(),2);
assert.equal(a.status,'pending');assert.equal(c.status,'pending');

const order=[];
await queue.run(async item=>{order.push(item.name);return {ok:true}});
assert.deepEqual(order,['A','C','B']);
assert.equal(queue.summary().done,3);
assert.equal(queue.remove(a.id),true);
assert.equal(queue.summary().total,2);
assert.equal(queue.clearFinished(),2);
assert.equal(queue.summary().total,0);

const locked=new Queue({snapshotEngine,idFactory:n=>`l${n}`});
const one=locked.enqueue({name:'One'},[]);const two=locked.enqueue({name:'Two'},[]);
let release;
const gate=new Promise(resolve=>{release=resolve});
const runPromise=locked.run(async()=>{await gate;return true});
await new Promise(resolve=>setTimeout(resolve,0));
assert.equal(locked.running,true);
assert.equal(locked.movePending(two.id,-1),false);
assert.equal(locked.remove(one.id),false);
assert.equal(locked.retry(two.id),false);
release();await runPromise;

console.log('render queue editing regression: ok');
