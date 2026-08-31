import assert from 'node:assert/strict';
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
console.log('Safe bundle import regression OK');
