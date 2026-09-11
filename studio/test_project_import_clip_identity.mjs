import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {ProfitMenteProjectImportEngine}=require('./project-import-engine.js');
const engine=new ProfitMenteProjectImportEngine();

const base={duration:12,format:'9:16'};

assert.throws(()=>engine.normalize({...base,clips:[
  {id:'1',track:0,start:0,duration:2},
  {id:'01',track:1,start:2,duration:2}
]}),/duplicado o ambiguo/,'numeric-looking clip ids that resolve to the same editor identity must be rejected');

assert.throws(()=>engine.normalize({...base,clips:[
  {id:'0',track:0,start:0,duration:2},
  {id:'-0',track:1,start:2,duration:2}
]}),/duplicado o ambiguo/,'negative zero and zero must not coexist because editor identity treats them as the same clip');

assert.throws(()=>engine.normalize({...base,clips:[
  {id:'1.0',track:0,start:0,duration:2},
  {id:'+1',track:1,start:2,duration:2}
]}),/duplicado o ambiguo/,'equivalent numeric spellings must not target two different imported clips');

const distinct=engine.normalize({...base,clips:[
  {id:'clip-1',track:0,start:0,duration:2},
  {id:'clip-01',track:1,start:2,duration:2},
  {id:'1e3',track:2,start:4,duration:2},
  {id:'1000',track:3,start:6,duration:2}
]});
assert.deepEqual(distinct.clips.map(c=>c.id),['clip-1','clip-01','1e3','1000'],'non-equivalent string identities must remain untouched');

console.log('Imported clip identity ambiguity QA passed');
