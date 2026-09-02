import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {ProfitMenteProjectImportEngine}=require('./project-import-engine.js');
const {ProfitMenteProjectMigrationEngine,CURRENT_VERSION}=require('./project-migration-engine.js');

const importer=new ProfitMenteProjectImportEngine();
const migration=new ProfitMenteProjectMigrationEngine();
const source={
  version:'1.3',name:'Legacy import',mode:'Manual',duration:8,format:'9:16',libraryId:'old-local-id',
  trackStates:{0:{locked:true}},
  clips:[{id:'late',track:0,name:'Late protected clip',start:20,duration:6,locked:true,asset:'camera-a'}]
};
const normalized=importer.normalize(source);
const migrated=migration.migrate(normalized).project;
assert.equal(migrated.version,CURRENT_VERSION);
assert.equal(migrated.duration,26,'import pipeline must expand stale duration instead of hiding/truncating late media');
assert.equal(migrated.clips[0].start,20);
assert.equal(migrated.clips[0].duration,6);
assert.equal(migrated.clips[0].locked,true);
assert.equal(migrated.clips[0].asset,'camera-a');
assert.equal(migrated.trackState[0].locked,true,'legacy track locks must migrate to the canonical trackState map');
assert.equal('trackStates' in migrated,false,'legacy trackStates must be removed after canonical migration');
assert.equal('libraryId' in migrated,false,'imported projects remain detached from the source library identity');

const integration=fs.readFileSync(new URL('./project-import-integration.js',import.meta.url),'utf8');
const normalizeAt=integration.indexOf('engine.normalize(parsed)');
const migrateAt=integration.indexOf('migrateImported(engine.normalize(parsed))');
const persistAt=integration.indexOf("typeof originalPersist==='function'");
assert.ok(normalizeAt>=0&&migrateAt>=0,'project import integration must route normalized JSON through migration');
assert.ok(migrateAt<persistAt,'migration must happen before the imported project is persisted');
assert.match(integration,/ProfitMenteProjectMigration\?\.engine/,'integration should reuse the active migration engine when available');
assert.match(integration,/f\.size>10\*1024\*1024/,'legacy import path must reject oversized project files before reading JSON');
console.log('Project import migration parity QA passed');
