const assert=require('assert');
const Engine=require('../studio/render-queue-storage-engine.js');

const writes=[];
const localStorageRef={
  setItem:(key,value)=>writes.push([key,value]),
  getItem:()=>null,
  removeItem:()=>{}
};
const engine=new Engine({indexedDBFactory:null,localStorageRef});

assert.equal(engine.saveFallback({queue:[{id:'plain',status:'pending'}]}),true,'plain JSON state must use fallback');
assert.equal(writes.length,1);

const structured=[
  {label:'bigint',value:1n},
  {label:'arraybuffer',value:new ArrayBuffer(4)},
  {label:'typed-array',value:new Uint8Array([1,2,3])},
  {label:'map',value:new Map([['duration',3]])},
  {label:'set',value:new Set(['queued'])}
];
if(typeof Blob!=='undefined')structured.push({label:'blob',value:new Blob(['media'])});

for(const {label,value} of structured){
  const before=writes.length;
  assert.equal(engine.saveFallback({queue:[{metadata:{nested:value}}]}),false,`${label} must not be serialized to localStorage`);
  assert.equal(writes.length,before,`${label} must not create a fallback write`);
}

const cyclic={queue:[]}; cyclic.self=cyclic;
assert.equal(engine.hasStructuredValue(cyclic),false,'cycles without structured-clone-only values must terminate safely');
assert.equal(engine.saveFallback(cyclic),false,'cyclic JSON state must fail closed without throwing');

console.log('PASS render queue structured fallback regression');
