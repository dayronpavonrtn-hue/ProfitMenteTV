import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {ProfitMenteProjectImportEngine}=require('./project-import-engine.js');
const engine=new ProfitMenteProjectImportEngine();

const legacy=engine.normalize({
  duration:'12',format:'9:16',fps:'30',clips:[{
    id:'legacy',track:'06',start:'1.5',duration:'4.0',speed:'1.25',sourceOffset:'2',volume:'0.8',fadeIn:'0.2',fadeOut:'0.3'
  }]
});
assert.equal(legacy.duration,12,'legacy numeric strings must remain supported');
assert.equal(legacy.fps,30,'legacy fps strings must remain supported');
assert.equal(legacy.clips[0].track,6,'legacy track aliases must remain numeric after import');
assert.equal(legacy.clips[0].start,1.5);
assert.equal(legacy.clips[0].duration,4);
assert.equal(legacy.clips[0].speed,1.25);
assert.equal(legacy.clips[0].sourceOffset,2);
assert.equal(legacy.clips[0].volume,.8);

for(const duration of [true,false,[],[12],{},null]){
  assert.throws(()=>engine.normalize({duration,format:'9:16',clips:[]}),/Duración de proyecto inválida/,`project duration must reject JSON coercion: ${JSON.stringify(duration)}`);
}
for(const track of [true,false,[],[1],{},[6]]){
  assert.throws(()=>engine.normalize({duration:12,format:'9:16',clips:[{id:'bad-track',track,start:0,duration:1}]}),/Pista de clip inválida/,`track must reject JSON coercion: ${JSON.stringify(track)}`);
}
for(const start of [true,false,[],[1],{},[0]]){
  assert.throws(()=>engine.normalize({duration:12,format:'9:16',clips:[{id:'bad-start',track:0,start,duration:1}]}),/Tiempo de clip inválido/,`clip start must reject JSON coercion: ${JSON.stringify(start)}`);
}
for(const clipDuration of [true,false,[],[1],{},[2]]){
  assert.throws(()=>engine.normalize({duration:12,format:'9:16',clips:[{id:'bad-duration',track:0,start:0,duration:clipDuration}]}),/Tiempo de clip inválido/,`clip duration must reject JSON coercion: ${JSON.stringify(clipDuration)}`);
}
for(const [field,value] of [
  ['speed',true],['sourceOffset',[]],['volume',[1]],['sourceVolume',false],['positionX',{}],['positionY',[10]],['scale',true],['rotation',[]],['opacity',[1]],['fadeIn',false],['fadeOut',{}]
]){
  assert.throws(()=>engine.normalize({duration:12,format:'9:16',clips:[{id:`bad-${field}`,track:0,start:0,duration:4,[field]:value}]}),/inválido/,`${field} must reject non numeric primitives instead of coercing them`);
}

const fpsFallback=engine.normalize({duration:12,format:'9:16',fps:true,clips:[]});
assert.equal(fpsFallback.fps,30,'malformed fps values must fall back instead of coercing booleans');

console.log('Strict project import numeric identity QA passed');
