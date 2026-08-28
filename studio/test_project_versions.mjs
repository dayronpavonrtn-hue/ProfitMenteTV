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
console.log('project version engine ok');
