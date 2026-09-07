import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {ProfitMenteProjectVersionEngine}=require('./project-version-engine.js');
class MemoryStorage{constructor(){this.map=new Map()}getItem(k){return this.map.has(k)?this.map.get(k):null}setItem(k,v){this.map.set(k,String(v))}}
const storage=new MemoryStorage();
const engine=new ProfitMenteProjectVersionEngine(storage,'versions',5);

assert.equal(engine.projectKey({libraryId:0,name:'Zero'}),'0','numeric project id 0 must remain addressable');
assert.equal(engine.projectKey({libraryId:-0,name:'Zero'}),'0','negative zero must canonicalize to zero');
assert.equal(engine.projectKey({libraryId:7}),'7');
assert.equal(engine.projectKey({libraryId:' 7 '}),'7','string ids preserve legacy key compatibility after trimming');
assert.equal(engine.projectKey({libraryId:false,id:'safe-id'}),'safe-id','boolean ids must not become project buckets');
assert.equal(engine.projectKey({libraryId:{toString(){return 'collision'}},id:'safe-id'}),'safe-id','object ids must not coerce into project keys');
assert.equal(engine.projectKey({libraryId:[],name:'Draft A'}),'draft:draft a','array ids must fall back safely');

const objectA={libraryId:{x:1},name:'Alpha',duration:10,clips:[]};
const objectB={libraryId:{x:2},name:'Beta',duration:20,clips:[]};
engine.create(objectA,'Alpha checkpoint');
engine.create(objectB,'Beta checkpoint');
assert.equal(engine.list(objectA).length,1,'object-valued ids must not collide across differently named drafts');
assert.equal(engine.list(objectB).length,1,'second invalid id must get its own fallback bucket');
assert.equal(engine.list(objectA)[0].project.duration,10);
assert.equal(engine.list(objectB)[0].project.duration,20);

const protoProject={libraryId:'__proto__',name:'Reserved',duration:33,clips:[]};
engine.create(protoProject,'Reserved key');
assert.equal(engine.list(protoProject).length,1,'reserved-looking scalar ids must remain usable');
assert.equal(engine.list(protoProject)[0].project.duration,33);
const raw=JSON.parse(storage.getItem('versions'));
assert.equal(Array.isArray(raw.__proto__),true,'reserved key must persist as an own JSON bucket');

console.log('project version identity ok');
