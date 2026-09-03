import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {ProfitMenteBundleImportEngine}=require('./bundle-import-engine.js');

const engine=new ProfitMenteBundleImportEngine({idFactory:()=> 'generated'});
const MB=1024*1024;

{
  const assets=[{id:'a',size:4*MB},{id:'b',blob:{size:6*MB},size:1}];
  assert.equal(engine.requiredPersistBytes(assets),10*MB,'blob size wins and total persisted bytes are calculated');
  const result=engine.storagePreflight(assets,{quota:100*MB,usage:40*MB});
  assert.equal(result.ok,true,'ample storage passes preflight');
  assert.equal(result.checked,true,'valid browser estimate is enforced');
  assert.equal(result.required,10*MB);
  assert.equal(result.available,60*MB);
}

{
  const assets=[{id:'large',size:20*MB}];
  const result=engine.storagePreflight(assets,{quota:25*MB,usage:5*MB});
  assert.equal(result.ok,false,'exact payload space is not enough because rollback-safe headroom is reserved');
  assert.equal(result.reserve,1*MB,'small/medium imports reserve at least 1 MB of headroom');
  assert.throws(()=>engine.assertStorageCapacity(assets,{quota:25*MB,usage:5*MB}),/Espacio local insuficiente/,'insufficient quota fails before any media write');
}

{
  const assets=[{id:'unknown',size:2*MB}];
  const result=engine.storagePreflight(assets,{});
  assert.equal(result.ok,true,'missing StorageManager estimate does not block supported browsers');
  assert.equal(result.checked,false,'unavailable estimate is reported as unchecked');
}

{
  const project={clips:[{id:'clip',asset:'same'}],assets:[{id:'same'}]};
  const existing=[{id:'same',name:'old.mp4',size:3,mime:'video/mp4',sourceLastModified:1}];
  const incoming=[{id:'same',name:'new.mp4',size:7*MB,mime:'video/mp4',sourceLastModified:2,blob:{size:7*MB}}];
  const prepared=engine.prepare(project,incoming,existing);
  assert.equal(prepared.assetsToPersist.length,1,'conflicting incoming media is isolated for persistence');
  assert.equal(engine.requiredPersistBytes(prepared.assetsToPersist),7*MB,'preflight counts only assets that will actually be written');
  assert.equal(prepared.project.clips[0].asset,'generated','project is remapped to the isolated asset id');
}

console.log('ProfitMente bundle import storage preflight regression: OK');
