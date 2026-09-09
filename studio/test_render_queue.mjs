import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const Queue=require('./render-queue-engine.js');

let tick=1000;
const queue=new Queue({now:()=>++tick,idFactory:n=>`q${n}`});
const project={name:'A',duration:10,clips:[{id:'c1',start:0,duration:5,effects:{zoom:1}}]};
const assets=[{id:'m1',name:'one.mp4',meta:{width:1920}}];
const first=queue.enqueue(project,assets);
project.name='EDITED';project.clips[0].effects.zoom=2;assets[0].meta.width=1280;
assert.equal(first.name,'A');
assert.equal(first.project.name,'A');
assert.equal(first.project.clips[0].effects.zoom,1);
assert.equal(first.assets[0].meta.width,1920);
assert.deepEqual(queue.summary(),{total:1,pending:1,running:0,done:0,error:0,cancelled:0,active:false});

queue.enqueue({name:'B',clips:[]},[]);
queue.enqueue({name:'C',clips:[]},[]);
const order=[];
await queue.run(async item=>{
  order.push(item.name);
  if(item.name==='B')throw new Error('fallo esperado');
  return {file:`${item.name}.mp4`};
},{continueOnError:true});
assert.deepEqual(order,['A','B','C']);
assert.equal(queue.get('q1').status,'done');
assert.equal(queue.get('q1').result.file,'A.mp4');
assert.equal(queue.get('q2').status,'error');
assert.equal(queue.get('q2').error,'fallo esperado');
assert.equal(queue.get('q3').status,'done');
assert.equal(queue.summary().pending,0);
assert.equal(queue.clearFinished(),3);
assert.equal(queue.summary().total,0);

const cancelQueue=new Queue({now:()=>++tick,idFactory:n=>`c${n}`});
cancelQueue.enqueue({name:'Long',clips:[]},[]);
cancelQueue.enqueue({name:'Never',clips:[]},[]);
let started=false;
const running=cancelQueue.run(async (_item,signal)=>{
  started=true;
  await new Promise(resolve=>signal.addEventListener('abort',resolve,{once:true}));
  throw Object.assign(new Error('cancelled'),{name:'AbortError'});
});
while(!started)await new Promise(resolve=>setTimeout(resolve,0));
assert.equal(cancelQueue.cancel({cancelPending:true}),1);
await running;
assert.equal(cancelQueue.get('c1').status,'cancelled');
assert.equal(cancelQueue.get('c2').status,'cancelled');
assert.equal(cancelQueue.summary().active,false);

const guardQueue=new Queue();
assert.throws(()=>guardQueue.enqueue(null,[]),/Proyecto inválido/);
await assert.rejects(()=>guardQueue.run(null),/trabajador/);

console.log('render queue regression: ok');
