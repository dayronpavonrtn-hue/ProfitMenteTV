import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const Portability=require('./project-portability.js');

const project={version:'1.3',name:'Portable',duration:12,format:'9:16',clips:[{id:'c1',track:0,asset:'a1',start:0,duration:6},{id:'c2',track:1,asset:'missing1',start:6,duration:4}],assets:[{id:'missing1',name:'missing.mov',type:'video',mime:'video/quicktime',size:7654321,duration:4.2,width:1920,height:1080,metadataVersion:1,blob:{mustNotLeak:true}}]};
const assets=[{id:'a1',name:'clip.mp4',type:'video',mime:'video/mp4',size:1234567,duration:8.25,width:1080,height:1920,metadataVersion:1,blob:{private:true},thumbnail:'data:image/jpeg;base64,NO'}];
const clean=Portability.serialize(project,assets);
assert.equal(clean.assets.length,2);
const current=clean.assets.find(a=>a.id==='a1'),missing=clean.assets.find(a=>a.id==='missing1');
assert.deepEqual(current,{id:'a1',name:'clip.mp4',type:'video',mime:'video/mp4',size:1234567,duration:8.25,width:1080,height:1920,metadataVersion:1});
assert.deepEqual(missing,{id:'missing1',name:'missing.mov',type:'video',mime:'video/quicktime',size:7654321,duration:4.2,width:1920,height:1080,metadataVersion:1});
assert.equal('blob' in current,false);
assert.equal('thumbnail' in current,false);
assert.equal('blob' in missing,false);

const restored=Portability.normalize(JSON.parse(JSON.stringify(clean)),{name:'old',duration:45,format:'16:9',clips:[]});
assert.equal(restored.name,'Portable');
assert.equal(restored.duration,12);
assert.equal(restored.format,'9:16');
assert.equal(restored.assets.find(a=>a.id==='a1').size,1234567);
assert.equal(restored.assets.find(a=>a.id==='a1').duration,8.25);
assert.equal(restored.assets.find(a=>a.id==='a1').width,1080);
assert.equal(restored.assets.find(a=>a.id==='a1').height,1920);
assert.equal(restored.assets.find(a=>a.id==='missing1').name,'missing.mov');
assert.equal(restored.assets.find(a=>a.id==='missing1').size,7654321);
assert.throws(()=>Portability.normalize({duration:0,clips:[]},{}),/Duración/);
assert.throws(()=>Portability.normalize([],{}),/inválido/);

const persistenceProject={name:'Persisted',duration:9,clips:[]};
const persistenceGuard={PRIMARY_KEY:'profitmente-project',serializeProject:value=>({raw:JSON.stringify(value)})};
const persisted=new Map([[persistenceGuard.PRIMARY_KEY,JSON.stringify(persistenceProject)]]);
const storage={getItem:key=>persisted.get(key)??null,setItem:(key,value)=>persisted.set(key,value)};
assert.equal(Portability.verifyPersistence(persistenceProject,{guard:persistenceGuard,autosave:{unsaved:false},storage}),true);
persisted.set(persistenceGuard.PRIMARY_KEY,JSON.stringify({...persistenceProject,name:'stale'}));
assert.throws(()=>Portability.verifyPersistence(persistenceProject,{guard:persistenceGuard,autosave:{unsaved:false},storage}),/almacenamiento persistente/);
persisted.set(persistenceGuard.PRIMARY_KEY,JSON.stringify(persistenceProject));
assert.throws(()=>Portability.verifyPersistence(persistenceProject,{guard:persistenceGuard,autosave:{unsaved:true,lastError:new Error('quota llena')},storage}),/quota llena/);
let saveFinished=false;
await Portability.saveAndVerify(persistenceProject,async()=>{await Promise.resolve();storage.setItem(persistenceGuard.PRIMARY_KEY,JSON.stringify(persistenceProject));saveFinished=true},{guard:persistenceGuard,autosave:{unsaved:false},storage});
assert.equal(saveFinished,true,'portable export must await save completion before persistence verification');

console.log('Project portability QA OK · missing-media metadata retained · persisted exports guarded');
