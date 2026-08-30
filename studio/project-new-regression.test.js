const assert=require('assert');
const fs=require('fs');
const path=require('path');
const {ProfitMenteProjectLibrary}=require('./project-library.js');

class MemoryStorage{
  constructor(){this.data=new Map()}
  getItem(k){return this.data.has(k)?this.data.get(k):null}
  setItem(k,v){this.data.set(k,String(v))}
}

const storage=new MemoryStorage();
const lib=new ProfitMenteProjectLibrary(storage);
const original=lib.save({version:'1.3',name:'Proyecto A',mode:'Automático',duration:61,format:'16:9',clips:[{id:'clip-a',track:0,start:0,duration:5}]});
assert.ok(original.libraryId,'saved project must have a library id');
original.name='Proyecto A editado';
original.duration=75;
assert.ok(lib.saveExisting(original),'existing project must be persisted before switching');

const blank=ProfitMenteProjectLibrary.blank();
assert.deepStrictEqual(blank,{version:'1.3',name:'Nuevo video',mode:'Manual',duration:45,format:'9:16',clips:[]});
assert.ok(!('libraryId' in blank),'a new project must never inherit the previous library id');
assert.strictEqual(lib.load(original.libraryId).name,'Proyecto A editado','previous project edits must remain saved');
assert.strictEqual(lib.load(original.libraryId).duration,75,'previous project duration must remain saved');

blank.name='Proyecto B';
assert.strictEqual(lib.load(original.libraryId).name,'Proyecto A editado','editing the blank project must not mutate the previous project');

const source=fs.readFileSync(path.join(__dirname,'project-library.js'),'utf8');
assert.match(source,/ProfitMenteProjectAutosave\?\.flush/,'new/open transitions must flush pending property autosave');
assert.match(source,/async function newProject\(\)/,'safe new project controller must be wired');
assert.match(source,/project=ProfitMenteProjectLibrary\.blank\(\)/,'new project must use the canonical blank project factory');
assert.match(source,/clearBtn\.onclick=.*newProject/,'the New project button must use the safe transition');
assert.match(source,/newProject:true/,'new project transition must emit a project-opened event for integrations');

console.log('safe new project regression passed');
