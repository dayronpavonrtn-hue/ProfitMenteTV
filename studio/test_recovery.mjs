import assert from 'node:assert/strict';
import {createRequire} from 'node:module';const require=createRequire(import.meta.url);const {ProfitMenteRecoveryEngine}=require('./recovery-engine.js');
class Storage{constructor(){this.m=new Map()}getItem(k){return this.m.has(k)?this.m.get(k):null}setItem(k,v){this.m.set(k,String(v))}removeItem(k){this.m.delete(k)}}
const storage=new Storage(),r=new ProfitMenteRecoveryEngine(storage,{limit:3});
let p={name:'Demo',duration:45,clips:[{id:'a',start:0,duration:5}]};
const a=r.capture(p,'inicio','2026-08-28T00:00:00Z');assert(a);assert.equal(r.list().length,1);
const duplicate=r.capture(p,'change','2026-08-28T00:01:00Z');assert.equal(duplicate.id,a.id);assert.equal(r.list().length,1,'deduplicates identical project states');
p.clips[0].start=2;const b=r.capture(p,'change','2026-08-28T00:02:00Z');assert.notEqual(b.id,a.id);assert.equal(r.latest().project.clips[0].start,2);
p.clips.push({id:'b',start:8,duration:3});const c=r.capture(p,'manual','2026-08-28T00:03:00Z');p.name='Demo v2';const d=r.capture(p,'manual','2026-08-28T00:04:00Z');assert.equal(r.list().length,3,'enforces snapshot limit');assert.equal(r.restore(c.id).clips.length,2);assert.equal(r.restore(a.id),null,'oldest snapshot pruned');
r.remove(c.id);assert.equal(r.list().length,2);r.clear();assert.equal(r.list().length,0);console.log('Recovery engine OK');