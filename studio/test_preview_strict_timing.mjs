import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('./preview-engine.js',import.meta.url),'utf8');
const sandbox={
  renderAt:async()=>{},
  project:{mode:'Manual',clips:[],trackState:{}},
  assets:[],
  window:{},
  canvas:{width:540,height:960},
  ctx:{
    clearRect(){},fillRect(){},fillText(){},save(){},restore(){},translate(){},rotate(){},scale(){},drawImage(){},strokeText(){},measureText(){return {width:10}}
  },
  console,
  Blob:class Blob{},
  URL:{createObjectURL(){return 'blob:test'},revokeObjectURL(){}},
  Image:class Image{},
  document:{createElement(){return {}}},
  setTimeout,clearTimeout,
  $:()=>null
};
vm.createContext(sandbox);
vm.runInContext(source,sandbox,{filename:'preview-engine.js'});
const {finiteNumber,clipWindow,activeCaptions,transformFor}=sandbox.window.ProfitMentePreviewEngine;

assert.equal(finiteNumber(true),null,'boolean timing values must not be coerced');
assert.equal(finiteNumber([1]),null,'array timing values must not be coerced');
assert.equal(finiteNumber({value:1}),null,'object timing values must not be coerced');
assert.equal(finiteNumber('  '),null,'blank timing strings must be rejected');
assert.equal(finiteNumber('1.25'),1.25,'legacy numeric strings must remain compatible');

assert.deepEqual(JSON.parse(JSON.stringify(clipWindow({start:'2',duration:'3'}))),{start:2,duration:3,end:5});
assert.equal(clipWindow({start:false,duration:3}),null);
assert.equal(clipWindow({start:2,duration:[3]}),null);
assert.equal(clipWindow({start:2,duration:0}),null);
assert.equal(clipWindow({start:-1,duration:3}),null);

sandbox.project.clips=[
  {id:'valid',track:3,start:'2',duration:'3'},
  {id:'bad-start',track:3,start:false,duration:3},
  {id:'bad-duration',track:3,start:2,duration:[3]},
  {id:'wrong-track',track:2,start:2,duration:3}
];
assert.deepEqual(Array.from(activeCaptions('3'),clip=>clip.id),['valid']);
assert.deepEqual(Array.from(activeCaptions(false),clip=>clip.id),[]);

const normal=transformFor({start:'1',duration:'4',positionX:'10',positionY:'5',scale:'1.2',rotation:'15',opacity:'0.8'},2);
assert.equal(normal.alpha,0.8);
assert.equal(normal.scale,1.2);
assert.ok(normal.x>0&&normal.y>0);
const corrupt=transformFor({start:false,duration:4,positionX:true},2);
assert.equal(corrupt.alpha,0,'corrupt clip timing must make the transform non-renderable');

console.log('Preview strict timing regression passed');
