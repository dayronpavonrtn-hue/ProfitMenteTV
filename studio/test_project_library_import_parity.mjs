import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {ProfitMenteProjectLibrary}=require('./project-library.js');
const {ProfitMenteProjectImportEngine}=require('./project-import-engine.js');

const input={accept:'',onchange:null};
const document={readyState:'complete',querySelector(selector){return selector==='#projectInput'?input:null}};
const window={ProfitMenteProjectLibrary,ProfitMenteProjectImportEngine};
const context={window,document,console,CustomEvent:class{},structuredClone,ProfitMenteProjectLibrary,ProfitMenteProjectImportEngine};
vm.createContext(context);
vm.runInContext(fs.readFileSync(new URL('./project-import-integration.js',import.meta.url),'utf8'),context);

assert.equal(window.ProfitMenteProjectLibraryImportGuard?.enabled,true,'library import guard is installed');
assert.equal(window.ProfitMenteProjectLibraryImportGuard?.storedProjectGuard,true,'saved project open guard is installed');
const normalize=ProfitMenteProjectLibrary.normalizeImportedProject;
const base={name:'Importado',mode:'Manual',duration:30,format:'9:16'};
const valid=normalize({...base,clips:[{id:'a',track:'0',start:'1.5',duration:'2.5',speed:'1.25',sourceOffset:'4'}]});
assert.equal(valid.clips[0].track,0);
assert.equal(valid.clips[0].start,1.5);
assert.equal(valid.clips[0].duration,2.5);
assert.equal(valid.clips[0].speed,1.25);
assert.equal(valid.clips[0].sourceOffset,4);
assert.throws(()=>normalize({...base,clips:[{id:'z',track:0,start:0,duration:0}]}),/Tiempo de clip inválido/);
assert.throws(()=>normalize({...base,clips:[{id:'bad-track',track:9,start:0,duration:1}]}),/Pista de clip inválida/);
assert.throws(()=>normalize({...base,clips:[{id:'bad-speed',track:0,start:0,duration:1,speed:99}]}),/Velocidad de clip inválid[oa]/);
assert.throws(()=>normalize({...base,clips:[{id:'dup',track:0,start:0,duration:1},{id:'dup',track:1,start:2,duration:1}]}),/ID de clip duplicado/);

class Mem{
  constructor(){this.map=new Map()}
  getItem(key){return this.map.has(key)?this.map.get(key):null}
  setItem(key,value){this.map.set(key,String(value))}
  removeItem(key){this.map.delete(key)}
}
const storage=new Mem(),key='saved-project-guard-test';
storage.setItem(key,JSON.stringify([
  {id:'legacy-ok',name:'Legacy OK',createdAt:'2026-09-01T00:00:00.000Z',updatedAt:'2026-09-12T00:00:00.000Z',project:{...base,libraryId:'legacy-ok',duration:'30',clips:[{id:'legacy-clip',track:'0',start:'1.5',duration:'2.5',speed:'1.25'}]}},
  {id:'corrupt',name:'Corrupt',createdAt:'2026-09-01T00:00:00.000Z',updatedAt:'2026-09-12T00:00:00.000Z',project:{...base,libraryId:'corrupt',duration:[30],clips:[{id:'bad',track:0,start:0,duration:1}]}}
]));
const savedLibrary=new ProfitMenteProjectLibrary(storage,key);
const opened=savedLibrary.load('legacy-ok');
assert.equal(opened.libraryId,'legacy-ok','saved identity is preserved after canonical validation');
assert.equal(opened.duration,30,'legacy numeric strings are canonicalized when a saved project opens');
assert.equal(opened.clips[0].track,0);
assert.equal(opened.clips[0].start,1.5);
assert.equal(opened.clips[0].duration,2.5);
assert.equal(opened.clips[0].speed,1.25);
assert.equal(savedLibrary.load('corrupt'),null,'structurally corrupt saved projects are blocked before reaching the editor runtime');

console.log('Project library import parity + saved project open guard OK');
