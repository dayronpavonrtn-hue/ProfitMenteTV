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

// A draft that has never been manually added to "Mis proyectos" must survive a transition.
const draft={version:'1.3',name:'Borrador sin guardar',mode:'Manual',duration:45,format:'9:16',clips:[{id:'draft-clip',track:0,start:0,duration:4}]};
assert.strictEqual(ProfitMenteProjectLibrary.hasUnsavedWork(draft),true,'edited draft must be recognized as work worth preserving');
const preserved=lib.saveDraftIfNeeded(draft);
assert.ok(preserved.libraryId,'unsaved draft must receive a library id before leaving it');
assert.strictEqual(lib.load(preserved.libraryId).name,'Borrador sin guardar','unsaved draft name must remain recoverable from project library');
assert.strictEqual(lib.load(preserved.libraryId).clips[0].id,'draft-clip','unsaved draft timeline must remain recoverable from project library');

// A pristine blank should not create noisy empty entries merely by opening another project.
const pristine=ProfitMenteProjectLibrary.blank();
const beforeCount=lib.list().length;
const untouched=lib.saveDraftIfNeeded(pristine);
assert.ok(!untouched.libraryId,'pristine blank must stay transient');
assert.strictEqual(lib.list().length,beforeCount,'pristine blank must not clutter project library');

// Property-only edits are still real work even with an empty timeline.
const propertyDraft={...ProfitMenteProjectLibrary.blank(),duration:90,frameRate:60};
assert.strictEqual(ProfitMenteProjectLibrary.hasUnsavedWork(propertyDraft),true,'property-only draft edits must be preserved');

const source=fs.readFileSync(path.join(__dirname,'project-library.js'),'utf8');
assert.match(source,/ProfitMenteProjectAutosave\?\.flush/,'new/open transitions must flush pending property autosave');
assert.match(source,/saveDraftIfNeeded\(project\)/,'project transitions must promote edited drafts into the project library');
assert.match(source,/async function newProject\(\)/,'safe new project controller must be wired');
assert.match(source,/project=ProfitMenteProjectLibrary\.blank\(\)/,'new project must use the canonical blank project factory');
assert.match(source,/clearBtn\.onclick=.*newProject/,'the New project button must use the safe transition');
assert.match(source,/newProject:true/,'new project transition must emit a project-opened event for integrations');

// The later-loaded recovery/reset enhancement must not replace the safe library transition
// with a direct blank-project assignment. It must flush the current project first and then
// delegate to the canonical new-project controller.
const resetIntegration=fs.readFileSync(path.join(__dirname,'project-reset-integration.js'),'utf8');
assert.match(resetIntegration,/ProfitMenteNewProject\?\.create/,'advanced reset must detect the safe project-library controller');
assert.match(resetIntegration,/ProfitMenteNewProject\?\.flushCurrentProject/,'advanced reset must require the safe project flush path');
assert.match(resetIntegration,/ProfitMenteNewProject\.flushCurrentProject\(\)/,'advanced reset must persist pending work before taking recovery snapshot');
assert.match(resetIntegration,/await window\.ProfitMenteNewProject\.create\(\)/,'advanced reset must delegate project creation to the canonical transition');
const flushIndex=resetIntegration.indexOf('ProfitMenteNewProject.flushCurrentProject()');
const snapshotIndex=resetIntegration.indexOf('engine.snapshot(window.profitMenteRecovery,project)');
const createIndex=resetIntegration.indexOf('await window.ProfitMenteNewProject.create()');
assert.ok(flushIndex>=0&&snapshotIndex>flushIndex&&createIndex>snapshotIndex,'advanced reset must flush, snapshot, then create in that order');

console.log('safe new project + unsaved draft + advanced reset regression passed');
