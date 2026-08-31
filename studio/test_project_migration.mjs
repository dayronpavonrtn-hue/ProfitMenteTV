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
assert.equal(migrated.project.version,'1.9');
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

const damaged=engine.migrate({version:'1.8',name:'Damaged identities',mode:'Manual',duration:8,format:'9:16',clips:[
  {id:'dup',track:0,name:'A',start:0,duration:2},
  {id:'dup',track:1,name:'B',start:2,duration:2},
  {id:'   ',track:3,name:'C',start:4,duration:2},
  {track:6,name:'D',start:6,duration:2}
],markers:[
  {id:'mark',time:7,label:' Final '},
  {id:'mark',time:99,label:' fuera '},
  {id:'',time:-4,label:''}
]});
const clipIds=damaged.project.clips.map(c=>c.id);
assert.equal(new Set(clipIds).size,clipIds.length,'all clip ids must be unique after migration');
assert.equal(clipIds[0],'dup','the first valid identity should be preserved');
assert.notEqual(clipIds[1],'dup','duplicate clip identities must be regenerated');
assert.ok(clipIds[2].trim()&&clipIds[3].trim(),'blank or missing clip identities must be generated');
assert.equal(damaged.repairs.clipIds,3,'migration should report repaired clip identities');
const markerIds=damaged.project.markers.map(m=>m.id);
assert.equal(new Set(markerIds).size,markerIds.length,'marker ids must be unique after migration');
assert.equal(damaged.repairs.markerIds,2,'migration should report duplicate and blank marker identity repairs');
assert.deepEqual(damaged.project.markers.map(m=>m.time),[0,7,8],'markers must be clamped and sorted inside the project');
assert.equal(damaged.project.markers[0].label,'Marcador','blank marker labels should be repaired');
assert.equal(damaged.project.markers[1].label,'Final','marker labels should be trimmed');
assert.equal(damaged.project.markers[2].label,'fuera','marker labels should be trimmed');

const square=engine.migrate({version:'1.0',name:'Square',mode:'Manual',duration:4,format:{width:1080,height:1080},clips:[]});
assert.equal(square.project.format,'1:1');
assert.equal(square.repairs.clipIds,0);
assert.equal(square.repairs.markerIds,0);

const future=engine.migrate({version:'2.0',name:'Future',mode:'Manual',duration:5,format:'16:9',clips:[],futureField:{x:1}});
assert.equal(future.project.version,'2.0','future project versions must never be downgraded');
assert.deepEqual(future.project.futureField,{x:1});

assert.throws(()=>engine.migrate(null),/inválido/i);
console.log('ProfitMente project migration QA passed');
