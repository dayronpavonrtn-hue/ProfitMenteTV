import assert from 'node:assert/strict';
import engineModule from './project-migration-engine.js';
const {ProfitMenteProjectMigrationEngine,CURRENT_VERSION}=engineModule;
const engine=new ProfitMenteProjectMigrationEngine();

const old={version:'1.3',name:'  Legacy  ',mode:'automatic',duration:'10',format:{width:1080,height:1920},custom:{keep:true},clips:[
  {id:'a',track:9,name:'Video',start:-2,duration:20,asset:'asset-1',sourceOffset:-3,speed:8,extra:'preserve'},
  {track:3,name:'Caption',start:9.98,duration:.001}
]};
const migrated=engine.migrate(old);
assert.equal(migrated.toVersion,CURRENT_VERSION);
assert.equal(migrated.project.version,'1.8');
assert.equal(migrated.project.name,'Legacy');
assert.equal(migrated.project.mode,'Automático');
assert.equal(migrated.project.format,'9:16');
assert.equal(migrated.project.duration,10);
assert.deepEqual(migrated.project.custom,{keep:true});
assert.equal(migrated.project.clips[0].track,6);
assert.equal(migrated.project.clips[0].start,0);
assert.equal(migrated.project.clips[0].duration,10);
assert.equal(migrated.project.clips[0].sourceOffset,0);
assert.equal(migrated.project.clips[0].speed,4);
assert.equal(migrated.project.clips[0].extra,'preserve');
assert.ok(migrated.project.clips[1].id);
assert.ok(migrated.project.clips[1].duration>=.05);
assert.equal(old.version,'1.3','migration must not mutate the source object');

const square=engine.migrate({version:'1.0',name:'Square',mode:'Manual',duration:4,format:{width:1080,height:1080},clips:[]});
assert.equal(square.project.format,'1:1');

const future=engine.migrate({version:'2.0',name:'Future',mode:'Manual',duration:5,format:'16:9',clips:[],futureField:{x:1}});
assert.equal(future.project.version,'2.0','future project versions must never be downgraded');
assert.deepEqual(future.project.futureField,{x:1});

assert.throws(()=>engine.migrate(null),/inválido/i);
console.log('ProfitMente project migration QA passed');
