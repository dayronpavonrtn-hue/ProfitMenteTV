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

console.log('Project library import parity guard OK');
