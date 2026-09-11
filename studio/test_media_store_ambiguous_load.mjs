import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {ProfitMenteMediaStore}=require('./media-store.js');

class Backend{
  constructor(items){this.items=items}
  async loadAll(){return this.items.slice()}
  async putMany(){}
  async deleteMany(){}
}

const store=new ProfitMenteMediaStore(new Backend([
  {id:7,name:'numeric-seven',type:'video'},
  {id:'7',name:'string-seven',type:'video'},
  {id:'safe',name:'safe-media',type:'image'}
]));
const loaded=await store.loadAll();
assert.deepEqual(loaded.map(x=>x.id),['safe'],'numeric/string aliases for the same persisted identity are ambiguous and must not choose an arbitrary asset');
assert.equal(store.get(7),null);
assert.equal(store.get('7'),null);
assert.equal(store.get('safe')?.name,'safe-media');

const repeated=new ProfitMenteMediaStore(new Backend([
  {id:'same',name:'first',type:'audio'},
  {id:'same',name:'second',type:'audio'},
  {id:'other',name:'other',type:'image'}
]));
await repeated.loadAll();
assert.equal(repeated.get('same'),null,'duplicate persisted string ids must also be rejected rather than silently overwritten');
assert.equal(repeated.get('other')?.name,'other');

console.log('Studio ambiguous persisted media identity guard OK');
