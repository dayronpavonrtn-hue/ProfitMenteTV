import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {ProfitMenteProjectVersionEngine}=require('./project-version-engine.js');

class MemoryStorage{
  constructor(){this.data=new Map()}
  getItem(k){return this.data.has(k)?this.data.get(k):null}
  setItem(k,v){this.data.set(k,String(v))}
}

const storage=new MemoryStorage();
const engine=new ProfitMenteProjectVersionEngine(storage,'test-versions',5);
const project={id:'p1',name:'Demo',duration:30,clips:[{id:'c1',track:0,start:0,duration:5}]};

let r=engine.createIfChanged(project,'Antes de generar');
assert.equal(r.created,true);
assert.equal(engine.list(project).length,1);

r=engine.createIfChanged(project,'Antes de generar otra vez');
assert.equal(r.created,false);
assert.equal(engine.list(project).length,1,'no debe duplicar snapshots idénticos');

project.clips[0].duration=6;
r=engine.createIfChanged(project,'Antes de reparar');
assert.equal(r.created,true);
assert.equal(engine.list(project).length,2);
assert.equal(engine.restore(project,r.row.id).clips[0].duration,6);

for(let i=0;i<8;i++){
  project.duration=31+i;
  engine.createIfChanged(project,`Auto ${i}`);
}
assert.equal(engine.list(project).length,5,'debe respetar el límite configurado');
assert.equal(engine.list(project)[0].project.duration,38);

console.log('automation checkpoint engine ok');
