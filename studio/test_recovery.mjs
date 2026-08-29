import assert from 'node:assert/strict';
import {createRequire} from 'node:module';const require=createRequire(import.meta.url);const {ProfitMenteRecoveryEngine}=require('./recovery-engine.js');
class Storage{constructor(){this.m=new Map()}getItem(k){return this.m.has(k)?this.m.get(k):null}setItem(k,v){this.m.set(k,String(v))}removeItem(k){this.m.delete(k)}}
const storage=new Storage(),r=new ProfitMenteRecoveryEngine(storage,{limit:6});
let p={name:'Demo',duration:45,clips:[{id:'a',start:0,duration:5}]};
const a=r.capture(p,'inicio','2026-08-28T00:00:00Z');assert(a);assert.equal(r.list().length,1);
const duplicate=r.capture(p,'change','2026-08-28T00:01:00Z');assert.equal(duplicate.id,a.id);assert.equal(r.list().length,1,'deduplicates identical project states');
p.clips[0].start=2;const b=r.capture(p,'change','2026-08-28T00:02:00Z');assert.notEqual(b.id,a.id);assert.equal(r.latest().project.clips[0].start,2);
p.clips.push({id:'b',start:8,duration:3});const c=r.capture(p,'manual','2026-08-28T00:03:00Z');
const saved={name:'Cliente A',libraryId:'lib-a',duration:30,clips:[{id:'v',start:0,duration:3}]};const d=r.capture(saved,'autoguardado','2026-08-28T00:04:00Z');
const groups=r.listGroups();assert.equal(groups.length,2,'keeps recovery histories for different projects discoverable');assert.equal(groups[0].group,'library:lib-a');assert.equal(groups[0].latestId,d.id);assert.equal(groups[0].count,1);assert.equal(groups[1].group,'draft:Demo');assert.equal(groups[1].count,3);
assert.equal(r.list(saved).length,1,'filters snapshots for the selected saved project');assert.equal(r.list(p).length,3,'filters snapshots for the current draft');assert.equal(r.restore(c.id).clips.length,2);assert.equal(r.restore(d.id).libraryId,'lib-a','restores snapshots from another project');
r.remove(c.id);assert.equal(r.list(p).length,2);r.pruneBefore('2026-08-28T00:02:00Z');assert.equal(r.list().length,2,'prunes the removed snapshot and entries older than the cutoff');r.clear();assert.equal(r.list().length,0);console.log('Recovery engine OK');