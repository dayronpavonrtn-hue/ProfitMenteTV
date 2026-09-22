const assert=require('assert');
const Engine=require('../studio/render-queue-storage-engine.js');

const writes=[];
const localStorageRef={
  setItem:(key,value)=>writes.push([key,value]),
  getItem:()=>null,
  removeItem:()=>{}
};
const engine=new Engine({indexedDBFactory:null,localStorageRef});

assert.equal(engine.saveFallback({queue:[{id:'plain',status:'pending',progress:0.5,tags:['mp4']}]}),true,'plain JSON state must use fallback');
assert.equal(writes.length,1);

const lossy=[
  {label:'undefined',value:undefined},
  {label:'bigint',value:1n},
  {label:'function',value:()=>1},
  {label:'symbol',value:Symbol('queue')},
  {label:'nan',value:NaN},
  {label:'infinity',value:Infinity},
  {label:'date',value:new Date('2026-09-22T00:00:00Z')},
  {label:'regexp',value:/mp4/i},
  {label:'arraybuffer',value:new ArrayBuffer(4)},
  {label:'typed-array',value:new Uint8Array([1,2,3])},
  {label:'map',value:new Map([['duration',3]])},
  {label:'set',value:new Set(['queued'])}
];
if(typeof Blob!=='undefined')lossy.push({label:'blob',value:new Blob(['media'])});

for(const {label,value} of lossy){
  const before=writes.length;
  assert.equal(engine.saveFallback({queue:[{metadata:{nested:value}}]}),false,`${label} must not be serialized lossily to localStorage`);
  assert.equal(writes.length,before,`${label} must not create a fallback write`);
}

const symbolKey=Symbol('hidden');
const symbolKeyed={queue:[{metadata:{ok:true}}]};
symbolKeyed.queue[0].metadata[symbolKey]='lost';
assert.equal(engine.saveFallback(symbolKeyed),false,'symbol-keyed metadata must not be silently dropped');

class QueueMetadata{constructor(){this.status='pending'}}
assert.equal(engine.saveFallback({queue:[{metadata:new QueueMetadata()}]}),false,'custom prototype metadata must stay in structured storage');

const cyclic={queue:[]}; cyclic.self=cyclic;
assert.equal(engine.hasStructuredValue(cyclic),false,'cycles without lossy leaf values must terminate safely');
assert.equal(engine.saveFallback(cyclic),false,'cyclic JSON state must fail closed without throwing');

console.log('PASS render queue structured fallback regression');
