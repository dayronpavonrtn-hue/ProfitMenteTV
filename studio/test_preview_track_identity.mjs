import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('./preview-engine.js',import.meta.url),'utf8');
const noop=()=>{};
const ctx={clearRect:noop,fillRect:noop,fillText:noop,save:noop,restore:noop,translate:noop,rotate:noop,scale:noop,drawImage:noop,strokeText:noop,measureText:t=>({width:String(t).length*10})};
const canvas={width:540,height:960};
const placeholder={hidden:false};
const sandbox={
  console,
  Blob:globalThis.Blob,
  URL:{createObjectURL:()=> 'blob:test',revokeObjectURL:noop},
  Image:class {},
  document:{createElement:()=>({})},
  window:{},
  assets:[],
  project:{mode:'Manual',clips:[],trackState:{},trackStates:{}},
  canvas,ctx,
  $:selector=>selector==='#placeholder'?placeholder:null,
  renderAt:async()=>{},
  setTimeout,clearTimeout,Map,Math,Number,String,Object,Array
};
sandbox.window=sandbox;
vm.runInNewContext(source,sandbox,{filename:'preview-engine.js'});
const api=sandbox.ProfitMentePreviewEngine;
assert.ok(api,'preview engine API should be exposed');

for(const [value,expected] of [[0,0],['0',0],['00',0],['+01.0',1],['03',3],['-0',0],[6,6],['6.0',6]])assert.equal(api.canonicalTrack(value),expected,`canonical track ${String(value)}`);
for(const value of [false,true,null,undefined,{},[],Symbol('3'),'1.5',-1,7,'video',''])assert.equal(api.canonicalTrack(value),null,`invalid track ${String(value)} must be rejected`);

sandbox.project.clips=[
  {id:'valid',track:'03.0',start:0,duration:5,name:'válido'},
  {id:'boolean',track:true,start:0,duration:5,name:'inválido'},
  {id:'object',track:{valueOf(){return 3}},start:0,duration:5,name:'inválido'},
  {id:'fraction',track:'3.5',start:0,duration:5,name:'inválido'},
  {id:'late',track:3,start:10,duration:5,name:'fuera de tiempo'}
];
assert.deepEqual(api.activeCaptions(2).map(c=>c.id),['valid'],'preview captions must use strict canonical track identity');

sandbox.project.trackState={'03.0':{hidden:true}};
assert.equal(api.isTrackHidden(3),true,'legacy numeric aliases should still hide the canonical track');
sandbox.project.trackState={'true':{hidden:true},'[object Object]':{hidden:true}};
assert.equal(api.isTrackHidden(1),false,'invalid aliases must not hide track 1');
assert.equal(api.isTrackHidden(3),false,'invalid aliases must not hide track 3');

console.log('Preview strict track identity + caption/visibility alias guard OK');
