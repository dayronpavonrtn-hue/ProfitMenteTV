import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);const {ProfitMenteProjectVersionEngine}=require('./project-version-engine.js');
class MemoryStorage{constructor(){this.map=new Map()}getItem(k){return this.map.has(k)?this.map.get(k):null}setItem(k,v){this.map.set(k,String(v))}removeItem(k){this.map.delete(k)}}
const storage=new MemoryStorage(),engine=new ProfitMenteProjectVersionEngine(storage,'versions',3);
let project={libraryId:'p1',name:'Demo',duration:10,clips:[{id:'a',start:0,duration:5}]};
const v1=engine.create(project,'Antes del cambio');project.clips[0].duration=2;const v2=engine.create(project,'Después del cambio');
assert.equal(engine.list(project).length,2);assert.equal(engine.list(project)[0].id,v2.id);const restored=engine.restore(project,v1.id);assert.equal(restored.clips[0].duration,5);assert.notEqual(restored,project);
project.clips[0].duration=1;assert.equal(engine.restore(project,v1.id).clips[0].duration,5);
engine.create(project,'3');engine.create(project,'4');assert.equal(engine.list(project).length,3,'must enforce version limit');
assert.equal(engine.remove(project,v2.id),true);assert.equal(engine.list(project).some(x=>x.id===v2.id),false);assert.equal(engine.clear(project),true);assert.equal(engine.list(project).length,0);

// Corrupted storage must never break automatic checkpoints or expose ambiguous duplicate IDs.
storage.setItem('versions',JSON.stringify({
  p1:[
    {id:'dup',label:'Más reciente',createdAt:'2026-09-03T12:00:00.000Z',project:{libraryId:'p1',name:'Demo',duration:12,clips:[]}},
    {id:'dup',label:'Copia ambigua',createdAt:'2026-09-03T11:00:00.000Z',project:{libraryId:'p1',name:'Demo',duration:99,clips:[]}},
    null,
    {id:'',project:{libraryId:'p1'}},
    {id:'bad-project',project:null},
    {id:'ok2',label:'Anterior',createdAt:'2026-09-03T10:00:00.000Z',project:{libraryId:'p1',name:'Demo',duration:8,clips:[]}}
  ],
  broken:{not:'an array'}
}));
assert.deepEqual(engine.list(project).map(x=>x.id),['dup','ok2'],'invalid and duplicate rows must be ignored');
assert.equal(engine.restore(project,'dup').duration,12,'duplicate restore must deterministically keep the newest stored copy');
assert.equal(engine.restore(project,''),null,'blank version IDs are invalid');
assert.equal(engine.remove(project,''),false,'blank version IDs must not mutate storage');
assert.doesNotThrow(()=>engine.create(project,'Tras corrupción'),'checkpoint creation must survive corrupt rows');
assert.equal(engine.list(project).length,3,'sanitized history still enforces the configured limit');
assert.equal(engine.repair(),3,'repair reports only valid retained versions');
const repaired=JSON.parse(storage.getItem('versions'));
assert.equal(Array.isArray(repaired.p1),true);assert.equal(repaired.p1.length,3);assert.equal('broken' in repaired,false,'repair removes invalid project buckets');
assert.equal(new Set(repaired.p1.map(x=>x.id)).size,repaired.p1.length,'repair persists unique version IDs');

storage.setItem('versions','not-json');
assert.deepEqual(engine.list(project),[],'invalid JSON must degrade to an empty version history');
assert.doesNotThrow(()=>engine.create(project,'Recuperado'),'new checkpoints must recover storage after invalid JSON');
assert.equal(engine.list(project).length,1);

storage.setItem('versions',JSON.stringify([]));
assert.deepEqual(engine.list(project),[],'top-level arrays are not valid version stores');
assert.doesNotThrow(()=>engine.create(project,'Recuperado de array'));
assert.equal(engine.list(project).length,1);
console.log('project version engine ok');
