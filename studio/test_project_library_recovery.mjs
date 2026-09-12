import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {ProfitMenteProjectLibrary}=require('./project-library.js');

class Mem{
  constructor(){this.m=new Map()}
  getItem(k){return this.m.has(k)?this.m.get(k):null}
  setItem(k,v){this.m.set(k,String(v))}
}

const storage=new Mem();
const lib=new ProfitMenteProjectLibrary(storage);
const first=lib.save({name:'Proyecto recuperable',duration:45,format:'9:16',mode:'Manual',clips:[]});
assert.ok(first.libraryId);
assert.equal(storage.getItem(lib.key),storage.getItem(lib.backupKey),'successful saves refresh the last-good library snapshot');

storage.setItem(lib.key,'{json roto');
const recovered=new ProfitMenteProjectLibrary(storage);
const rows=recovered.list();
assert.equal(rows.length,1,'corrupt primary library recovers all rows from last-good snapshot');
assert.equal(rows[0].project.name,'Proyecto recuperable');
assert.equal(recovered.recoveredFromBackup,true);
assert.equal(recovered.quarantinedCorrupt,true);
assert.equal(storage.getItem(recovered.corruptKey),'{json roto','corrupt payload is preserved for diagnostics');
assert.doesNotThrow(()=>JSON.parse(storage.getItem(recovered.key)),'recovery repairs the primary library slot');

storage.m.delete(recovered.key);
const missingPrimary=new ProfitMenteProjectLibrary(storage);
assert.equal(missingPrimary.list().length,1,'missing primary slot also restores the last-good snapshot');
assert.equal(missingPrimary.recoveredFromBackup,true);

storage.setItem(recovered.key,'{bad again');
storage.setItem(recovered.backupKey,'{bad backup');
const noUsableBackup=new ProfitMenteProjectLibrary(storage);
assert.deepEqual(noUsableBackup.list(),[],'invalid primary plus invalid backup fails closed instead of inventing projects');
assert.equal(noUsableBackup.storageAvailable,false);
assert.equal(noUsableBackup.quarantinedCorrupt,true);

const mixedStorage=new Mem();
const mixedKey='profitmente-project-library';
const validProject={name:'Conservable',duration:45,format:'9:16',mode:'Manual',clips:[]};
const mixedRaw=JSON.stringify([
  null,
  {
    id:'good',name:' Conservable ',createdAt:'2026-09-10T12:00:00.000Z',updatedAt:'2026-09-11T12:00:00.000Z',
    project:{...validProject,libraryId:'wrong'}
  },
  {id:'bad-project',name:'Dañado',updatedAt:{oops:true},project:null},
  {
    id:'legacy-time',name:'Legacy',createdAt:'not-a-date',updatedAt:'2026-09-09T10:00:00.000Z',
    project:{...validProject,name:'Legacy',libraryId:'legacy-time'}
  }
]);
mixedStorage.setItem(mixedKey,mixedRaw);
const mixed=new ProfitMenteProjectLibrary(mixedStorage,mixedKey);
const mixedRows=mixed.list();
assert.equal(mixedRows.length,2,'partially corrupt libraries retain their usable projects');
assert.equal(mixedRows[0].id,'good');
assert.equal(mixedRows[0].name,'Conservable','recoverable names are normalized without changing the project identity');
assert.equal(mixedRows[0].project.libraryId,'good','row and project library ids are reconciled');
assert.equal(mixedRows[1].createdAt,'2026-09-09T10:00:00.000Z','a valid updated timestamp repairs a broken created timestamp');
assert.equal(mixed.repairedCorruptRows,true);
assert.equal(mixed.quarantinedCorrupt,true);
assert.equal(mixedStorage.getItem(mixed.corruptKey),mixedRaw,'the original mixed payload is quarantined before repair');
assert.equal(JSON.parse(mixedStorage.getItem(mixed.key)).length,2,'the repaired primary slot contains only usable projects');
assert.equal(JSON.parse(mixedStorage.getItem(mixed.backupKey)).length,2,'the repaired library becomes the new last-good snapshot');
assert.doesNotThrow(()=>mixed.list(),'a repaired library can be listed repeatedly without crashing the Studio panel');
assert.equal(mixed.recoveryState().repairedCorruptRows,true);

const duplicateStorage=new Mem();
const duplicateRaw=JSON.stringify([
  {
    id:7,name:'Versión anterior',createdAt:'2026-09-01T00:00:00.000Z',updatedAt:'2026-09-10T10:00:00.000Z',
    project:{...validProject,name:'Versión anterior',libraryId:7}
  },
  {
    id:'7',name:'Versión nueva',createdAt:'2026-09-05T00:00:00.000Z',updatedAt:'2026-09-12T10:00:00.000Z',
    project:{...validProject,name:'Versión nueva',libraryId:'7'}
  }
]);
duplicateStorage.setItem(mixedKey,duplicateRaw);
const duplicateLibrary=new ProfitMenteProjectLibrary(duplicateStorage,mixedKey);
const duplicateRows=duplicateLibrary.list();
assert.equal(duplicateRows.length,1,'duplicate logical ids are collapsed into one project');
assert.equal(duplicateRows[0].id,'7','legacy numeric and string ids share the same normalized identity');
assert.equal(duplicateRows[0].project.name,'Versión nueva','the most recently updated duplicate wins');
assert.equal(duplicateRows[0].createdAt,'2026-09-01T00:00:00.000Z','deduplication preserves the earliest creation timestamp');
assert.equal(duplicateRows[0].updatedAt,'2026-09-12T10:00:00.000Z');
assert.equal(duplicateLibrary.repairedCorruptRows,true);
assert.equal(duplicateLibrary.quarantinedCorrupt,true);
assert.equal(duplicateStorage.getItem(duplicateLibrary.corruptKey),duplicateRaw,'duplicate source data is quarantined before repair');
assert.equal(JSON.parse(duplicateStorage.getItem(duplicateLibrary.key)).length,1,'the repaired primary slot no longer contains ambiguous duplicate ids');
assert.equal(duplicateLibrary.load(7).name,'Versión nueva','load resolves the repaired identity deterministically');

const partialBackupStorage=new Mem();
partialBackupStorage.setItem(`${mixedKey}-last-good`,JSON.stringify([
  null,
  {
    id:'backup',name:'Backup',createdAt:'2026-09-01T00:00:00.000Z',updatedAt:'2026-09-01T01:00:00.000Z',
    project:{...validProject,name:'Backup',libraryId:'backup'}
  }
]));
const partialBackup=new ProfitMenteProjectLibrary(partialBackupStorage,mixedKey);
const partialBackupRows=partialBackup.list();
assert.equal(partialBackupRows.length,1,'backup recovery also ignores unusable rows instead of failing the whole snapshot');
assert.equal(partialBackupRows[0].id,'backup');
assert.equal(partialBackup.recoveredFromBackup,true);

class WriteDenied extends Mem{
  constructor(){super();this.fail=false}
  setItem(k,v){if(this.fail&&k==='profitmente-project-library')throw new Error('quota exceeded');super.setItem(k,v)}
}
const deniedStorage=new WriteDenied(),denied=new ProfitMenteProjectLibrary(deniedStorage);
const stable=denied.save({name:'Último bueno',duration:30,format:'9:16',mode:'Manual',clips:[]});
const backupBefore=deniedStorage.getItem(denied.backupKey);
deniedStorage.fail=true;
stable.duration=90;
assert.ok(denied.saveExisting(stable),'session remains editable when the primary write fails');
assert.equal(denied.storageAvailable,false);
assert.equal(denied.memoryDirty,true);
assert.equal(deniedStorage.getItem(denied.backupKey),backupBefore,'failed primary writes never advance the recovery snapshot');
assert.equal(denied.load(stable.libraryId).duration,90,'unsynced work remains available in memory');

deniedStorage.fail=false;
stable.duration=120;
assert.ok(denied.saveExisting(stable));
assert.equal(denied.storageAvailable,true);
assert.equal(denied.memoryDirty,false);
assert.equal(JSON.parse(deniedStorage.getItem(denied.backupKey))[0].project.duration,120,'backup advances after storage recovers');

console.log('Project library last-good recovery + partial corruption repair + duplicate-id repair + failed-write safety OK');
