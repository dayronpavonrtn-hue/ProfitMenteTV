import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {ProfitMenteProjectImportEngine}=require('./project-import-engine.js');

const engine=new ProfitMenteProjectImportEngine();
const base={version:'1.3',name:'Legacy IDs',mode:'Manual',duration:20,format:'9:16',fps:30};

{
  const project=engine.normalize({...base,clips:[
    {id:1,track:0,name:'Video',start:0,duration:5},
    {id:2.5,track:1,name:'Overlay',start:5,duration:5},
    {id:-0,track:3,name:'Caption',start:10,duration:5}
  ]});
  assert.deepEqual(project.clips.map(c=>c.id),['1','2.5','0'],'numeric legacy IDs should be preserved as canonical strings');
}

{
  assert.throws(()=>engine.normalize({...base,clips:[
    {id:1,track:0,start:0,duration:5},
    {id:'01',track:1,start:5,duration:5}
  ]}),/duplicado o ambiguo/,'numeric/string aliases must still be rejected as ambiguous duplicates');
}

{
  const project=engine.normalize({...base,clips:[
    {id:null,track:0,start:0,duration:5},
    {track:1,start:5,duration:5}
  ]});
  assert.deepEqual(project.clips.map(c=>c.id),['imported-clip-1','imported-clip-2'],'missing IDs should keep deterministic fallback IDs');
}

console.log('Project import legacy numeric ID regression: OK');
