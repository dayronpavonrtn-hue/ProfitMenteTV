import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const {ProfitMenteProjectLibrary}=require('./project-library.js');
const {ProfitMenteProjectImportEngine}=require('./project-import-engine.js');
const {ProfitMenteProjectMigrationEngine,CURRENT_VERSION}=require('./project-migration-engine.js');

class MemStorage{
  constructor(){this.map=new Map()}
  getItem(key){return this.map.has(key)?this.map.get(key):null}
  setItem(key,value){this.map.set(key,String(value))}
}

const migrationIntegration=fs.readFileSync(new URL('./project-migration-integration.js',import.meta.url),'utf8');
const windowStub={ProfitMenteProjectLibrary,ProfitMenteProjectImportEngine,ProfitMenteProjectMigrationEngine};
vm.runInNewContext(migrationIntegration,{window:windowStub,console,JSON});

assert.equal(ProfitMenteProjectLibrary.prototype.importSerialized.__profitmenteMigrationWrapped,true,'library JSON import must be wrapped by the canonical migration pipeline');
assert.equal(typeof windowStub.ProfitMenteProjectMigration?.migrateImportedProject,'function');

const storage=new MemStorage();
const lib=new ProfitMenteProjectLibrary(storage);
const legacy={
  version:'1.3',libraryId:'foreign-library-id',name:'Legacy library import',mode:'Manual',duration:8,format:'9:16',
  trackStates:{0:{locked:true},4:{muted:true}},
  clips:[{id:'late',track:0,name:'Late clip',start:20,duration:6,asset:'camera-a'}]
};
const imported=lib.importSerialized(JSON.stringify({kind:'profitmente-studio-project',schemaVersion:1,project:legacy}));
assert.equal(imported.version,CURRENT_VERSION);
assert.equal(imported.duration,26,'library import must extend stale duration before saving so late clips are not truncated');
assert.equal(imported.clips[0].start,20);
assert.equal(imported.clips[0].duration,6);
assert.equal(imported.trackState[0].locked,true,'legacy track locks must survive library import');
assert.equal(imported.trackState[4].muted,true,'legacy track mute state must survive library import');
assert.equal('trackStates' in imported,false,'legacy trackStates must not be persisted again');
assert.ok(imported.libraryId,'imported project must receive a fresh local library identity');
assert.notEqual(imported.libraryId,legacy.libraryId,'foreign library identity must not overwrite a local project');
assert.equal(lib.list().length,1);
assert.equal(lib.load(imported.libraryId).version,CURRENT_VERSION,'canonical migrated project must be the value persisted in Mis proyectos');
assert.equal('trackStates' in lib.load(imported.libraryId),false);

const before=lib.list().length;
assert.throws(()=>lib.importSerialized(JSON.stringify({...legacy,version:'99.0'})),/versión más nueva/i,'future project versions must be rejected rather than downgraded');
assert.equal(lib.list().length,before,'failed future-version imports must not create partial library entries');
assert.throws(()=>lib.importSerialized(JSON.stringify({...legacy,format:'4:5'})),/Formato de proyecto no compatible/,'strict import validation must still run before migration');
assert.equal(lib.list().length,before,'failed validation must not mutate the library');
assert.throws(()=>lib.importSerialized(JSON.stringify({...legacy,clips:[{id:'bad-track',track:7,start:0,duration:1}]})),/Pista de clip inválida/,'Mis proyectos import must reject tracks outside Studio just like the main JSON importer');
assert.throws(()=>lib.importSerialized(JSON.stringify({...legacy,clips:[{id:'zero',track:0,start:0,duration:0}]})),/Tiempo de clip inválido/,'Mis proyectos import must reject zero-length clips');
assert.throws(()=>lib.importSerialized(JSON.stringify({...legacy,clips:[{id:'dup',track:0,start:0,duration:1},{id:'dup',track:1,start:1,duration:1}]})),/ID de clip duplicado/,'Mis proyectos import must reject duplicate clip ids before editor tools can target an ambiguous clip');
assert.throws(()=>lib.importSerialized(JSON.stringify({...legacy,clips:[{id:'bad-opacity',track:0,start:0,duration:1,opacity:1.5}]})),/Opacidad inválido/,'Mis proyectos import must apply canonical editable-field bounds');
assert.equal(lib.list().length,before,'all strict validation failures must remain atomic and leave the library unchanged');

console.log('Project library import migration QA passed');
