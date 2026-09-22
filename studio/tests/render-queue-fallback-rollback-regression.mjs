import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const Storage=require('../render-queue-storage-engine.js');

function storageWithFailure(mode){
  let value='legacy-good-state';
  return {
    getItem(){return value},
    setItem(_key,next){
      if(mode==='throw'&&next!=='legacy-good-state')throw new Error('quota');
      if(mode==='corrupt'&&next!=='legacy-good-state'){value=next.slice(0,Math.max(1,next.length>>1));return}
      value=next;
    },
    removeItem(){value=null},
    value(){return value}
  };
}

for(const mode of ['throw','corrupt']){
  const local=storageWithFailure(mode);
  const engine=new Storage({indexedDBFactory:null,localStorageRef:local});
  assert.equal(engine.saveFallback({version:1,items:[{id:'render-1'}]}),false,`${mode}: failed write must report false`);
  assert.equal(local.value(),'legacy-good-state',`${mode}: failed write must preserve the previous durable queue bytes`);
}

const empty={value:null,getItem(){return this.value},setItem(_k,v){this.value=v.slice(0,2)},removeItem(){this.value=null}};
const engine=new Storage({indexedDBFactory:null,localStorageRef:empty});
assert.equal(engine.saveFallback({version:1,items:[]}),false);
assert.equal(empty.value,null,'failed first write must not leave corrupt bytes behind');
console.log('render queue fallback rollback regression: ok');
