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
// User-facing JSON imports are strict: a declared 8 s project must not smuggle a
// clip ending at 26 s past preview/render bounds. Legacy recovery still keeps its
// duration-extension migration below, where the migration engine owns that repair.
assert.throws(()=>importer.normalize(source),/Clip excede la duración del proyecto/,'strict JSON import must reject stale project bounds before replacing the active edit');
const migrated=migration.migrate(source).project;
assert.equal(migrated.version,CURRENT_VERSION);
assert.equal(migrated.duration,26,'legacy migration must still recover stale persisted projects by extending duration');
assert.equal(migrated.clips[0].start,20);
assert.equal(migrated.clips[0].duration,6);
assert.equal(migrated.clips[0].locked,true);
assert.equal(migrated.clips[0].asset,'camera-a');
assert.equal(migrated.trackState[0].locked,true,'legacy track locks must migrate to the canonical trackState map');
assert.equal('trackStates' in migrated,false,'legacy trackStates must be removed after canonical migration');
assert.equal(migrated.libraryId,'old-local-id','local legacy migration must preserve its library identity; only external import detaches it');
// Once migrated into canonical bounds, the same payload is safe to pass through
// the external-import validator, which must detach the foreign library identity.
const normalizedMigrated=importer.normalize(migrated);
assert.equal(normalizedMigrated.duration,26);
assert.equal('libraryId' in normalizedMigrated,false,'external import validation must detach library identity after canonical migration');

const integration=fs.readFileSync(new URL('./project-import-integration.js',import.meta.url),'utf8');
const flushCallAt=integration.indexOf('if(!flushCurrentProject())return;');
const normalizeAt=integration.indexOf('engine.normalize(parsed)');
const migrateAt=integration.indexOf('migrateImported(engine.normalize(parsed))');
const assignAt=integration.indexOf('project=migrateImported(engine.normalize(parsed))');
const persistAt=integration.indexOf("typeof originalPersist==='function'");
assert.ok(normalizeAt>=0&&migrateAt>=0,'project import integration must retain a migration-safe fallback for partial module loading');
assert.ok(flushCallAt>=0&&assignAt>=0&&flushCallAt<assignAt,'fallback import must flush the current project before replacing the active project');
assert.ok(migrateAt<persistAt,'fallback migration must happen before the imported project is persisted');
assert.match(integration,/ProfitMenteProjectTransfer/,'primary JSON import should reuse the persistent project-library transfer integration');
assert.match(integration,/transfer\?\.importProjectFile|transfer\.importProjectFile/,'primary JSON import must delegate to the guarded project-library importer when available');
assert.ok(integration.indexOf("transfer?.importProjectFile==='function'")<integration.indexOf('JSON.parse(await f.text())'),'persistent library import must be attempted before the detached fallback parses/replaces project state');
assert.match(integration,/ProfitMenteNewProject\?\.flushCurrentProject/,'fallback import should reuse the guarded project-switch flush when available');
assert.match(integration,/ProfitMenteProjectAutosave\?\.flush/,'fallback import should flush autosave before replacing the active project');
assert.match(integration,/ProfitMenteProjectMigration\?\.engine/,'fallback integration should reuse the active migration engine when available');
assert.match(integration,/f\.size>10\*1024\*1024/,'import path must reject oversized project files before reading JSON');
assert.match(integration,/profitmente:project-opened/,'fallback successful JSON import should announce the project switch to dependent integrations');
console.log('Project import migration and persistence parity QA passed');
