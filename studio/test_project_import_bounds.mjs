import assert from 'node:assert/strict';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const {ProfitMenteProjectImportEngine}=require('./project-import-engine.js');

const engine=new ProfitMenteProjectImportEngine();
const base={name:'Import QA',mode:'Manual',duration:10,format:'9:16',fps:30,clips:[]};

const valid=engine.normalize({...base,clips:[{id:'v1',track:0,start:8,duration:2}]});
assert.equal(valid.clips[0].start,8);
assert.equal(valid.clips[0].duration,2);

assert.throws(
  ()=>engine.normalize({...base,clips:[{id:'too-long',track:0,start:9,duration:2}]}),
  /Clip excede la duración del proyecto/,
  'an imported clip must not extend past the project duration'
);

assert.throws(
  ()=>engine.normalize({...base,clips:[{id:'past-end',track:4,start:10,duration:.1}]}),
  /Clip excede la duración del proyecto/,
  'a clip starting at the project end with positive duration must be rejected'
);

assert.throws(
  ()=>engine.normalize({...base,clips:[{id:'bool-track',track:true,start:0,duration:1}]}),
  /Pista de clip inválid[oa]/,
  'boolean tracks must not be coerced into real timeline tracks'
);

assert.throws(
  ()=>engine.normalize({...base,clips:[{id:'bool-start',track:0,start:true,duration:1}]}),
  /Tiempo de clip inválido/,
  'boolean time values must not be coerced into timeline positions'
);

const legacy=engine.normalize({...base,clips:[{id:'legacy',track:'01',start:'2',duration:'3'}]});
assert.equal(legacy.clips[0].track,1);
assert.equal(legacy.clips[0].start,2);
assert.equal(legacy.clips[0].duration,3);

console.log('ProfitMente Studio project import bounds QA passed');
