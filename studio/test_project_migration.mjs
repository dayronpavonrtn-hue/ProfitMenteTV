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
assert.equal(migrated.project.duration,20,'migration must expand duration instead of truncating existing clip content');
assert.equal(migrated.repairs.durationExtended,true);
assert.deepEqual(migrated.project.custom,{keep:true});
assert.equal(migrated.project.clips[0].track,6);
assert.equal(migrated.project.clips[0].start,0);
assert.equal(migrated.project.clips[0].duration,20,'legacy clip duration must be preserved when it exceeds declared project duration');
assert.equal(migrated.project.clips[0].sourceOffset,0);
assert.equal(migrated.project.clips[0].speed,4);
assert.equal(migrated.project.clips[0].extra,'preserve');
assert.ok(migrated.project.clips[1].id);
assert.ok(migrated.project.clips[1].duration>=.05);
assert.equal(old.version,'1.3','migration must not mutate the source object');

const numericStrings=engine.migrate({version:'1.7',name:'Legacy numeric strings',mode:'Manual',duration:'8',format:'9:16',clips:[
  {id:'legacy-values',track:'0',name:'Legacy clip',start:'1.5',duration:'4',sourceOffset:'2.25',speed:'1.5',volume:'0.8',sourceVolume:'1.2',positionX:'-12',positionY:'18',scale:'1.25',rotation:'-45',opacity:'0.65',fadeIn:'0.2',fadeOut:'0.35'}
]});
const migratedValues=numericStrings.project.clips[0];
for(const key of ['track','start','duration','sourceOffset','speed','volume','sourceVolume','positionX','positionY','scale','rotation','opacity','fadeIn','fadeOut'])assert.equal(typeof migratedValues[key],'number',`${key} must be numeric after browser-storage migration`);
assert.equal(migratedValues.start+migratedValues.duration,5.5,'migrated timeline timing must remain arithmetic-safe');
assert.equal(migratedValues.sourceOffset+1,3.25,'migrated source offsets must not concatenate');
assert.equal(migratedValues.fadeIn+migratedValues.fadeOut,.55,'migrated fades must remain arithmetic-safe');

const malformedEditNumbers=engine.migrate({version:'1.7',name:'Malformed edit values',mode:'Manual',duration:4,format:'9:16',clips:[
  {id:'bad-values',track:0,start:0,duration:4,volume:'not-a-number',opacity:'Infinity',scale:'NaN',rotation:'999',fadeIn:'99',fadeOut:'-2'}
]});
const repairedValues=malformedEditNumbers.project.clips[0];
assert.equal('volume' in repairedValues,false,'invalid optional numeric fields should be removed during recovery');
assert.equal('opacity' in repairedValues,false,'non-finite optional numeric fields should be removed during recovery');
assert.equal('scale' in repairedValues,false,'NaN optional numeric fields should be removed during recovery');
assert.equal(repairedValues.rotation,180,'recoverable edit numbers should clamp to Studio limits');
assert.equal(repairedValues.fadeIn,4,'fade in should clamp to recovered clip duration');
assert.equal(repairedValues.fadeOut,0,'fade out should clamp to zero instead of remaining negative');

const overhang=engine.migrate({version:'1.6',name:'Recovered long edit',mode:'Manual',duration:12,format:'16:9',trackStates:{0:{locked:true}},clips:[
  {id:'early',track:0,name:'Early',start:0,duration:5,locked:true},
  {id:'late',track:0,name:'Late protected take',start:40,duration:7,locked:true,asset:'camera-a'}
]});
assert.equal(overhang.project.duration,47,'a clip beyond stale project duration must remain at its original timeline position');
assert.equal(overhang.project.clips[1].start,40);
assert.equal(overhang.project.clips[1].duration,7);
assert.equal(overhang.project.clips[1].locked,true);
assert.equal(overhang.project.clips[1].asset,'camera-a');
assert.equal(overhang.project.trackState[0].locked,true,'legacy track protection metadata must migrate into canonical trackState');
assert.equal('trackStates' in overhang.project,false,'legacy trackStates must be removed after canonical migration');
assert.equal(overhang.repairs.durationExtended,true);

const mixedState=engine.migrate({version:'1.9',name:'Mixed state',mode:'Manual',duration:5,format:'9:16',trackState:{0:{locked:false,hidden:false,label:'Video'},1:{muted:true}},trackStates:{0:{locked:true,hidden:true,legacyOnly:'keep'},1:{muted:false,solo:true},2:{locked:true}},clips:[]});
assert.deepEqual(mixedState.project.trackState[0],{locked:true,hidden:true,legacyOnly:'keep',label:'Video'},'true safety flags from either schema must win while metadata is preserved');
assert.deepEqual(mixedState.project.trackState[1],{muted:true,solo:true},'mixed mute/solo state must merge conservatively');
assert.deepEqual(mixedState.project.trackState[2],{locked:true},'legacy-only tracks must survive migration');
assert.equal('trackStates' in mixedState.project,false,'mixed projects must finish with only canonical trackState');

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
assert.equal(damaged.repairs.durationExtended,false);
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
assert.equal(square.repairs.durationExtended,false);

const future={version:'2.0',name:'Future',mode:'Manual',duration:5,format:'16:9',clips:[{id:'future',track:9,name:'Future track',start:0,duration:5}],futureField:{x:1}};
assert.throws(()=>engine.migrate(future),err=>/versión más nueva/i.test(err.message)&&/v1\.9/.test(err.message),'future project schemas must be rejected instead of normalized destructively');
assert.equal(future.clips[0].track,9,'rejected future projects must remain untouched');
assert.deepEqual(future.futureField,{x:1});

assert.throws(()=>engine.migrate(null),/inválido/i);
console.log('ProfitMente project migration QA passed');
