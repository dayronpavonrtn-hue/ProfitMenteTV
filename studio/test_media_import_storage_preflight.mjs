import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

globalThis.window=globalThis;
const source=fs.readFileSync(new URL('./media-import-engine.js',import.meta.url),'utf8');
vm.runInThisContext(source,{filename:'media-import-engine.js'});
const E=globalThis.ProfitMenteMediaImportEngine;
assert.ok(E,'media import engine must be exported');

const MB=1024*1024;
assert.equal(E.requiredPersistBytes([{size:2*MB},{blob:{size:3*MB}},{size:0},{size:-1}]),5*MB,'only positive persisted media bytes should count');

const enough=E.storagePreflight([{size:2*MB}],{quota:10*MB,usage:2*MB});
assert.deepEqual(enough,{ok:true,required:2*MB,available:8*MB,reserve:MB,checked:true});

const tight=E.storagePreflight([{size:4*MB}],{quota:5*MB,usage:MB});
assert.equal(tight.checked,true);
assert.equal(tight.required,4*MB);
assert.equal(tight.available,4*MB);
assert.equal(tight.reserve,MB);
assert.equal(tight.ok,false,'import must be blocked when there is no safety headroom for the new blobs');
assert.throws(()=>E.assertStorageCapacity([{size:4*MB}],{quota:5*MB,usage:MB}),/Espacio local insuficiente para importar los medios/);

const unknown=E.storagePreflight([{size:4*MB}],{});
assert.equal(unknown.ok,true,'unsupported storage estimates must fail open instead of disabling imports');
assert.equal(unknown.checked,false);
assert.equal(unknown.available,null);

const noNewBytes=E.storagePreflight([{size:0}],{quota:MB,usage:MB});
assert.equal(noNewBytes.ok,true);
assert.equal(noNewBytes.checked,false,'duplicates/zero-byte persistence plans should not be blocked by quota');

const estimateIndex=source.indexOf('navigator?.storage?.estimate');
const gateIndex=source.indexOf('engine.assertStorageCapacity(pendingNew,estimate)');
const atomicIndex=source.indexOf('persistBatchAtomic(pendingMigrations,pendingNew)');
const memoryCommitIndex=source.indexOf('for(const migration of pendingMigrations){Object.assign');
assert.ok(estimateIndex>=0,'browser storage estimate must be wired into normal media import');
assert.ok(gateIndex>estimateIndex,'capacity gate must run after obtaining the estimate');
assert.ok(atomicIndex>gateIndex,'atomic persistence must run after capacity preflight');
assert.ok(memoryCommitIndex>atomicIndex,'in-memory library state must change only after the IndexedDB transaction succeeds');
assert.match(source,/database\.transaction\(STORE,'readwrite'\)/,'new media and identity migrations must share one IndexedDB transaction');
assert.match(source,/tx\.onabort=.*reject/,'aborted batch transactions must reject the import');
assert.match(source,/transactionFailed:true/,'storage transaction failures must be explicit to callers');
assert.match(source,/pendingNew\.push\(asset\)/,'new media must be staged before persistence');
assert.match(source,/blocked:true/,'blocked imports must return an explicit non-destructive result');

console.log('normal media import storage preflight and atomic persistence regression passed');
