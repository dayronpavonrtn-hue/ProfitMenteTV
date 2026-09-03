import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source=fs.readFileSync(new URL('./preview-engine.js',import.meta.url),'utf8');
const draws=[];
const texts=[];

class MockImage{
  constructor(){this.naturalWidth=1080;this.naturalHeight=1920;this.width=1080;this.height=1920;this.onload=null;this.onerror=null;this._id='';}
  set src(value){this._id=value;queueMicrotask(()=>this.onload?.())}
  get src(){return this._id}
}

const ctx={
  clearRect(){},fillRect(){},fillText(text){texts.push(String(text))},strokeText(){},save(){},restore(){},translate(){},rotate(){},scale(){},measureText(){return {width:100}},
  drawImage(source){draws.push(source._id||source.src||'unknown')},
  set fillStyle(v){},set font(v){},set textAlign(v){},set textBaseline(v){},set lineWidth(v){},set strokeStyle(v){},set globalAlpha(v){},set filter(v){}
};
const placeholder={hidden:false};
const canvas={width:540,height:960};
const assets=[
  {id:'7',type:'image',blob:{id:'string-seven'}},
  {id:8,type:'image',blob:{id:'number-eight'}},
  {id:0,type:'image',blob:{id:'zero'}}
];
const project={mode:'Manual',trackState:{},clips:[
  {id:'c1',track:0,asset:7,start:0,duration:1,name:'numeric clip to string media'},
  {id:'c2',track:0,asset:' 8 ',start:1,duration:1,name:'trimmed string clip to numeric media'},
  {id:'c3',track:0,asset:0,start:2,duration:1,name:'zero id media'},
  {id:'c4',track:0,asset:'   ',start:3,duration:1,name:'blank media ref'}
]};
const context={
  console,queueMicrotask,setTimeout,clearTimeout,Image:MockImage,assets,project,canvas,ctx,renderAt:()=>{},
  $:()=>placeholder,
  URL:{createObjectURL(blob){if(!blob)throw new TypeError('missing blob');return `blob:${blob.id}`},revokeObjectURL(){}},
  document:{createElement(){throw new Error('video not expected in this regression')}},
  window:{}
};
vm.createContext(context);
vm.runInContext(source,context,{filename:'preview-engine.js'});

await context.renderAt(.5);
await context.renderAt(1.5);
await context.renderAt(2.5);

assert.deepEqual(draws,['blob:string-seven','blob:number-eight','blob:zero'],'preview must resolve numeric/string aliases, whitespace, and media id 0');
assert.equal(placeholder.hidden,true,'valid legacy media identities must paint instead of showing the offline fallback');
assert.equal(context.window.ProfitMentePreviewEngine.mediaIdKey(' 8 '),'8');
assert.equal(context.window.ProfitMentePreviewEngine.mediaIdKey(0),'0');
assert.equal(context.window.ProfitMentePreviewEngine.mediaIdKey('   '),null);
assert.equal(context.window.ProfitMentePreviewEngine.assetById(7).id,'7');
assert.equal(context.window.ProfitMentePreviewEngine.assetById(' 8 ').id,8);
assert.equal(context.window.ProfitMentePreviewEngine.assetById(0).id,0);

texts.length=0;
await context.renderAt(3.5);
assert.equal(draws.length,3,'blank media references must not accidentally resolve to a real asset');
assert.ok(texts.some(text=>/Editor manual listo/i.test(text)),'blank references should behave like an empty visual slot, not missing media');

console.log('Preview media identity regressions passed');
