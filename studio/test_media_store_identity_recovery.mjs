import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {ProfitMenteMediaStore}=require('./media-store.js');

class Backend {
  constructor(items){this.items=items}
  async loadAll(){return this.items.slice()}
  async putMany(){}
  async deleteMany(){}
}

// IndexedDB can legally contain numeric key 7 and string key "7" at the same time.
// Studio canonicalizes both to the same runtime identity, so choosing either record
// would silently attach timeline clips to an arbitrary file. Ambiguous identities
// must therefore be quarantined instead of guessed.
const ambiguous=new ProfitMenteMediaStore(new Backend([
  {id:7,name:'legacy-number.mp4',type:'video'},
  {id:'7',name:'canonical-string.mp4',type:'video'},
  {id:'safe',name:'safe.png',type:'image'}
]));
const recovered=await ambiguous.loadAll();
assert.deepEqual(recovered.map(x=>x.id),['safe']);
assert.equal(ambiguous.get(7),null);
assert.equal(ambiguous.get('7'),null);
assert.equal(ambiguous.get('safe')?.name,'safe.png');

// A lone legacy numeric identity is safe to migrate in memory to its canonical
// string representation, preserving compatibility with modern project JSON.
const legacy=new ProfitMenteMediaStore(new Backend([
  {id:12,name:'voice.wav',type:'audio'}
]));
const [migrated]=await legacy.loadAll();
assert.equal(migrated.id,'12');
assert.equal(legacy.get(12),migrated);
assert.equal(legacy.get('12'),migrated);

// Non-colliding string IDs that look numeric but are not canonical numbers remain
// distinct; "07" must never be merged with numeric 7.
const distinct=new ProfitMenteMediaStore(new Backend([
  {id:7,name:'seven.mp4',type:'video'},
  {id:'07',name:'zero-seven.mp4',type:'video'}
]));
await distinct.loadAll();
assert.equal(distinct.get('7')?.name,'seven.mp4');
assert.equal(distinct.get('07')?.name,'zero-seven.mp4');

console.log('Studio persisted media identity recovery guard OK');
