import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {ProfitMenteBundleImportEngine}=require('./bundle-import-engine.js');

const existingA={id:'asset-a',name:'local.mp4',type:'video',mime:'video/mp4',size:10,sourceContentHash:'same-hash',blob:new Blob(['local'])};
const existingB={id:'asset-b',name:'music.mp3',type:'audio',mime:'audio/mpeg',size:20,sourceContentHash:'music-hash',blob:new Blob(['music'])};
const project={libraryId:'source-library-id',name:'Portable',duration:12,format:'9:16',clips:[{id:'c1',track:0,start:0,duration:4,asset:'asset-a'}],assets:[{id:'asset-a',name:'local.mp4'}]};

const reuseEngine=new ProfitMenteBundleImportEngine({idFactory:()=>{throw new Error('no remap expected')}});
const reuse=reuseEngine.prepare(project,[{...existingA,blob:new Blob(['same package media'])}],[existingA,existingB]);
assert.equal(reuse.project.libraryId,undefined,'un paquete importado nunca debe conservar libraryId');
assert.equal(reuse.assets.length,2,'reutilizar un medio no debe ocultar otros medios locales');
assert.equal(reuse.assetsToPersist.length,0,'un medio idéntico ya local no debe reescribirse');
assert.deepEqual(reuse.stats,{added:0,reused:1,remapped:0,totalIncoming:1});
assert.equal(reuse.project.clips[0].asset,'asset-a');
assert.equal(project.libraryId,'source-library-id','prepare no debe mutar el proyecto fuente');

const conflictIncoming={id:'asset-a',name:'different.mp4',type:'video',mime:'video/mp4',size:99,sourceContentHash:'different-hash',blob:new Blob(['different'])};
const newIncoming={id:'asset-c',name:'photo.jpg',type:'image',mime:'image/jpeg',size:7,sourceContentHash:'photo-hash',blob:new Blob(['photo'])};
const conflictEngine=new ProfitMenteBundleImportEngine({idFactory:()=> 'asset-imported-safe'});
const conflict=conflictEngine.prepare(project,[conflictIncoming,newIncoming],[existingA,existingB]);
assert.equal(conflict.project.clips[0].asset,'asset-imported-safe','la timeline debe apuntar al ID remapeado');
assert.equal(conflict.project.assets[0].id,'asset-imported-safe','la metadata del proyecto debe seguir el remapeo');
assert.equal(conflict.assets.find(a=>a.id==='asset-a').sourceContentHash,'same-hash','el medio local conflictivo debe quedar intacto');
assert.equal(conflict.assets.find(a=>a.id==='asset-imported-safe').sourceContentHash,'different-hash');
assert.ok(conflict.assets.some(a=>a.id==='asset-b'),'los medios locales ajenos al paquete deben conservarse');
assert.ok(conflict.assets.some(a=>a.id==='asset-c'),'los medios nuevos del paquete deben añadirse');
assert.deepEqual(conflict.assetsToPersist.map(a=>a.id),['asset-imported-safe','asset-c']);
assert.deepEqual(conflict.stats,{added:1,reused:0,remapped:1,totalIncoming:2});

assert.throws(()=>conflictEngine.prepare({clips:[]},[{name:'sin-id'}],[]),/sin identificador/);
assert.throws(()=>conflictEngine.prepare({clips:null},[],[]),/timeline válida/);

const integration=fs.readFileSync(new URL('./bundle-import-integration.js',import.meta.url),'utf8');
assert.match(integration,/migrateRestoredProject\(restored\.project\)/,'bundle restore must migrate the restored project before media preparation');
assert.match(integration,/ProfitMenteProjectImportEngine/,'bundle restore must use the same canonical validator as JSON project import');
assert.match(integration,/new ImportEngine\(\)\.normalize\(value\)/,'bundle restore must canonicalize numeric strings and reject invalid clips before persistence');
assert.match(integration,/ProfitMenteProjectLibrary\?\.normalizeImportedProject/,'bundle restore needs a library normalizer fallback while bootstrap is still loading');
assert.match(integration,/ProfitMenteProjectMigration\?\.engine/,'bundle restore should reuse the active canonical migration engine');
assert.match(integration,/ProfitMenteProjectMigrationEngine/,'bundle restore needs a migration fallback when the integration wrapper is unavailable');
const validateAt=integration.indexOf('normalizeRestoredProject(value)');
const migrateAt=integration.indexOf('migrateRestoredProject(restored.project)');
const prepareAt=integration.indexOf('importer.prepare(normalized');
assert.ok(validateAt>=0&&migrateAt>=0&&prepareAt>migrateAt,'validation and migration must finish before asset remapping and project persistence');

assert.match(integration,/const previousAssets=.*previousProject=/s,'bundle restore must snapshot the active Studio state before persistence');
assert.match(integration,/persistedIds\.push\(asset\.id\)/,'every newly persisted bundle asset must be tracked for rollback');
assert.match(integration,/rollbackPersistedAssets\(persistedIds\)/,'failed imports must delete media already written by the same attempt');
assert.match(integration,/library\.remove\(createdLibraryId\)/,'a newly created library project must be removed when activation fails');
assert.match(integration,/project=previousProject/,'failed activation must restore the previous project in memory');
assert.match(integration,/assets=previousAssets/,'failed activation must restore the previous media library in memory');
assert.match(integration,/\.reverse\(\)/,'rollback should unwind newly persisted assets in reverse write order');
assert.match(integration,/ProfitMenteMediaStorageResilience/,'bundle rollback should use the resilient storage delete path when available');
console.log('Safe bundle import regression OK');