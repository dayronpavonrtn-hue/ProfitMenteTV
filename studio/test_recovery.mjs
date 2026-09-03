import assert from 'node:assert/strict';
import {createRequire} from 'node:module';const require=createRequire(import.meta.url);const {ProfitMenteRecoveryEngine}=require('./recovery-engine.js');
class Storage{constructor(){this.m=new Map()}getItem(k){return this.m.has(k)?this.m.get(k):null}setItem(k,v){this.m.set(k,String(v))}removeItem(k){this.m.delete(k)}}
const storage=new Storage(),r=new ProfitMenteRecoveryEngine(storage,{limit:6});
let p={name:'Demo',duration:45,clips:[{id:'a',start:0,duration:5}]};
const a=r.capture(p,'inicio','2026-08-28T00:00:00Z');assert(a);assert.equal(r.list().length,1);assert(p.recoveryMeta?.draftId,'draft capture assigns a stable recovery identity');
const draftId=p.recoveryMeta.draftId,draftGroup=`draft-id:${draftId}`;
const duplicate=r.capture(p,'change','2026-08-28T00:01:00Z');assert.equal(duplicate.id,a.id);assert.equal(r.list().length,1,'deduplicates identical project states');
p.clips[0].start=2;const b=r.capture(p,'change','2026-08-28T00:02:00Z');assert.notEqual(b.id,a.id);assert.equal(r.latest().project.clips[0].start,2);
p.clips.push({id:'b',start:8,duration:3});const c=r.capture(p,'manual','2026-08-28T00:03:00Z');
p.name='Demo renombrado';const renamed=r.capture(p,'autoguardado','2026-08-28T00:03:30Z');assert.equal(p.recoveryMeta.draftId,draftId,'renaming does not rotate draft recovery identity');assert.equal(renamed.group,draftGroup);assert.equal(r.list(p).length,4,'all pre-rename recovery points remain visible for the renamed draft');
const saved={name:'Cliente A',libraryId:'lib-a',duration:30,clips:[{id:'v',start:0,duration:3}]};const d=r.capture(saved,'autoguardado','2026-08-28T00:04:00Z');
const groups=r.listGroups();assert.equal(groups.length,2,'keeps recovery histories for different projects discoverable');assert.equal(groups[0].group,'library:lib-a');assert.equal(groups[0].latestId,d.id);assert.equal(groups[0].count,1);assert.equal(groups[1].group,draftGroup);assert.equal(groups[1].count,4);
assert.equal(r.list(saved).length,1,'filters snapshots for the selected saved project');assert.equal(r.list(p).length,4,'filters snapshots for the current renamed draft');assert.equal(r.restore(c.id).clips.length,2);assert.equal(r.restore(d.id).libraryId,'lib-a','restores snapshots from another project');
r.remove(c.id);assert.equal(r.list(p).length,3);r.pruneBefore('2026-08-28T00:02:00Z');assert.equal(r.list().length,3,'prunes the removed snapshot and entries older than the cutoff');

// Upgrade recovery rows produced before drafts had stable identities. The same
// identity must also be recoverable after a reload where the main project record
// has not yet persisted recoveryMeta.
const legacyStorage=new Storage(),legacyProject={name:'Legacy draft',duration:18,clips:[{id:'legacy',start:0,duration:2}]};
const legacyFingerprint=JSON.stringify(legacyProject);
legacyStorage.setItem('profitmente-recovery-v1',JSON.stringify([{id:'legacy-row',createdAt:'2026-08-28T00:10:00Z',reason:'legacy',name:'Legacy draft',libraryId:null,group:'draft:Legacy draft',fingerprint:legacyFingerprint,project:structuredClone(legacyProject)}]));
const legacyRecovery=new ProfitMenteRecoveryEngine(legacyStorage,{limit:6}),upgraded=legacyRecovery.capture(legacyProject,'inicio','2026-08-28T00:11:00Z');
assert.equal(upgraded.id,'legacy-row','identical legacy snapshot is upgraded instead of duplicated');assert(legacyProject.recoveryMeta?.draftId,'legacy draft receives a stable identity');
const legacyDraftId=legacyProject.recoveryMeta.draftId,legacyGroup=`draft-id:${legacyDraftId}`;
assert.equal(legacyRecovery.listGroups()[0].group,legacyGroup,'legacy name-based group migrates to stable draft identity');
legacyProject.name='Legacy renamed';legacyRecovery.capture(legacyProject,'autoguardado','2026-08-28T00:12:00Z');assert.equal(legacyRecovery.list(legacyProject).length,2,'legacy history survives a rename after migration');
const reloadWithoutMeta={name:'Legacy renamed',duration:18,clips:[{id:'legacy',start:0,duration:2}]};
const reloadedRecovery=new ProfitMenteRecoveryEngine(legacyStorage,{limit:6});const reloadCapture=reloadedRecovery.capture(reloadWithoutMeta,'inicio','2026-08-28T00:13:00Z');
assert.equal(reloadWithoutMeta.recoveryMeta?.draftId,legacyDraftId,'reload adopts identity from an exact existing recovery snapshot');assert.equal(reloadCapture.group,legacyGroup);assert.equal(reloadedRecovery.list(reloadWithoutMeta).length,2,'reload does not split the same draft into a new recovery group');

// A single heavily edited project must not consume the entire shared recovery
// budget and erase every usable point from other projects.
const fairStorage=new Storage(),fair=new ProfitMenteRecoveryEngine(fairStorage,{limit:6});
const older={name:'Older',libraryId:'older',duration:20,clips:[]};
fair.capture(older,'inicio','2026-08-28T01:00:00Z');older.duration=21;fair.capture(older,'edit','2026-08-28T01:01:00Z');
const hot={name:'Hot',libraryId:'hot',duration:30,clips:[]};
for(let i=0;i<10;i++){hot.duration=30+i;fair.capture(hot,'edit',`2026-08-28T02:${String(i).padStart(2,'0')}:00Z`)}
assert.equal(fair.list().length,6,'shared recovery store still respects its global limit');
assert.equal(fair.list(older).length,2,'two recent recovery points from an older project survive heavy edits elsewhere');
assert.equal(fair.list(hot).length,4,'remaining recovery capacity is used by the most active project');
assert.equal(fair.restore(fair.latest(older).id).libraryId,'older','preserved older-project recovery remains restorable');

const valid=r.list()[0];
const validRaw={...valid,fingerprint:'legacy-fingerprint'};
storage.setItem('profitmente-recovery-v1',JSON.stringify([null,{id:'broken-no-project'},validRaw,'bad-row']));
assert.doesNotThrow(()=>r.listGroups(),'one malformed snapshot must not break the recovery panel');
assert.equal(r.list().length,1,'valid snapshots survive beside corrupt rows');
assert.equal(r.restore(valid.id).name,valid.project.name,'valid project remains restorable');
const repaired=r.repair();assert.deepEqual(repaired,{kept:1,removed:3},'repair removes only invalid recovery rows');
const repairedRows=JSON.parse(storage.getItem('profitmente-recovery-v1'));assert.equal(repairedRows.length,1);assert.equal(repairedRows[0].id,valid.id);

// Corrupt stores can contain repeated snapshot IDs after interrupted/manual storage
// edits. Only the newest occurrence may survive; otherwise restore(id) is ambiguous
// and duplicate IDs can bypass the recovery budget because selection is ID-based.
const dupStorage=new Storage(),dupRecovery=new ProfitMenteRecoveryEngine(dupStorage,{limit:3});
const newer={id:'same-id',createdAt:'2026-08-28T03:02:00Z',reason:'newer',name:'Newest',libraryId:'lib-dup',group:'library:lib-dup',fingerprint:'new',project:{name:'Newest',libraryId:'lib-dup',duration:22,clips:[]}};
const olderDuplicate={id:'same-id',createdAt:'2026-08-28T03:01:00Z',reason:'older',name:'Old duplicate',libraryId:'lib-dup',group:'library:lib-dup',fingerprint:'old',project:{name:'Old duplicate',libraryId:'lib-dup',duration:11,clips:[]}};
const unique={id:'unique-id',createdAt:'2026-08-28T03:00:00Z',reason:'unique',name:'Unique',libraryId:'lib-unique',group:'library:lib-unique',fingerprint:'unique',project:{name:'Unique',libraryId:'lib-unique',duration:8,clips:[]}};
dupStorage.setItem('profitmente-recovery-v1',JSON.stringify([newer,olderDuplicate,unique]));
assert.equal(dupRecovery.list().length,2,'duplicate snapshot IDs are rejected during decode');
assert.equal(dupRecovery.restore('same-id').name,'Newest','the first/newest snapshot wins deterministically');
assert.equal(dupRecovery.listGroups().find(x=>x.group==='library:lib-dup').count,1,'duplicate IDs do not inflate group counts');
assert.deepEqual(dupRecovery.repair(),{kept:2,removed:1},'repair reports duplicate IDs as removed corruption');
const dedupedRows=JSON.parse(dupStorage.getItem('profitmente-recovery-v1'));
assert.equal(dedupedRows.length,2,'repair persists only unique snapshot identities');
assert.equal(dedupedRows.filter(x=>x.id==='same-id').length,1);

storage.setItem('profitmente-recovery-v1','{"broken json"');
assert.deepEqual(r.list(),[],'invalid JSON degrades to an empty recovery history instead of crashing');
const afterCorruption=r.capture({name:'Recovered after corruption',duration:12,clips:[]},'autoguardado','2026-08-28T00:05:00Z');
assert(afterCorruption,'capture recreates the recovery store after corrupted JSON');
assert.equal(r.list().length,1);assert.equal(r.latest().project.name,'Recovered after corruption');

r.clear();assert.equal(r.list().length,0);console.log('Recovery engine OK');