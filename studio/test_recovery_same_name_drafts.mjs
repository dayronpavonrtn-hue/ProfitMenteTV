import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {ProfitMenteRecoveryEngine}=require('./recovery-engine.js');

class Storage{
  constructor(){this.m=new Map()}
  getItem(k){return this.m.has(k)?this.m.get(k):null}
  setItem(k,v){this.m.set(k,String(v))}
  removeItem(k){this.m.delete(k)}
}

const storage=new Storage();
const recovery=new ProfitMenteRecoveryEngine(storage,{limit:8});

const first={name:'Nuevo video',duration:45,clips:[{id:'a',start:0,duration:5}]};
const firstSnapshot=recovery.capture(first,'inicio','2026-09-07T11:00:00Z');
assert(firstSnapshot);
const firstDraftId=first.recoveryMeta?.draftId;
assert(firstDraftId,'first draft receives a stable identity');

// A genuinely new draft commonly starts with the same default name. Different
// content must force a different identity instead of merging both histories.
const second={name:'Nuevo video',duration:30,clips:[]};
const secondSnapshot=recovery.capture(second,'inicio','2026-09-07T11:01:00Z');
assert(secondSnapshot);
const secondDraftId=second.recoveryMeta?.draftId;
assert(secondDraftId,'second draft receives a stable identity');
assert.notEqual(secondDraftId,firstDraftId,'same-name drafts with different state remain isolated');
assert.equal(recovery.list(first).length,1,'first draft keeps its own recovery history');
assert.equal(recovery.list(second).length,1,'second draft keeps its own recovery history');
assert.equal(recovery.listGroups().length,2,'same-name independent drafts remain separate recovery groups');

// Exact-state recovery after reload is still allowed to recover the original
// identity when recoveryMeta has not yet reached the main project record.
const reloadWithoutMeta={name:'Nuevo video',duration:45,clips:[{id:'a',start:0,duration:5}]};
const reloadSnapshot=recovery.capture(reloadWithoutMeta,'inicio','2026-09-07T11:02:00Z');
assert.equal(reloadWithoutMeta.recoveryMeta?.draftId,firstDraftId,'exact reload reuses the matching recovery identity');
assert.equal(reloadSnapshot.id,firstSnapshot.id,'exact reload deduplicates against the original snapshot');
assert.equal(recovery.listGroups().length,2,'exact reload does not create a third recovery group');

console.log('Recovery same-name draft isolation OK');
