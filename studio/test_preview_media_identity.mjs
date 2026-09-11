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
  {id:'007',type:'image',blob:{id:'canonical-seven'}},
  {id:8,type:'image',blob:{id:'number-eight'}},
  {id:0,type:'image',blob:{id:'zero'}},
  {id:'hero-a',type:'image',blob:{id:'text-hero'}},
  {id:'true',type:'image',blob:{id:'text-true'}}
];
const project={mode:'Manual',trackState:{},clips:[
  {id:'c1',track:0,asset:'7.0',start:0,duration:1,name:'decimal alias to padded numeric media'},
  {id:'c2',track:0,asset:' +08.0 ',start:1,duration:1,name:'signed padded alias to numeric media'},
  {id:'c3',track:0,asset:'-0',start:2,duration:1,name:'negative zero alias to zero media'},
  {id:'c4',track:0,asset:' hero-a ',start:3,duration:1,name:'trimmed text media'},
  {id:'c5',track:0,asset:'   ',start:4,duration:1,name:'blank media ref'}
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
await context.renderAt(3.5);

assert.deepEqual(draws,['blob:canonical-seven','blob:number-eight','blob:zero','blob:text-hero'],'preview must resolve canonical numeric aliases, media id 0, and trimmed text ids');
assert.equal(placeholder.hidden,true,'valid legacy media identities must paint instead of showing the offline fallback');

const engine=context.window.ProfitMentePreviewEngine;
assert.equal(engine.mediaIdKey(' 8 '),'n:8');
assert.equal(engine.mediaIdKey('008.0'),'n:8');
assert.equal(engine.mediaIdKey('+8'),'n:8');
assert.equal(engine.mediaIdKey(0),'n:0');
assert.equal(engine.mediaIdKey('-0'),'n:0');
assert.equal(engine.mediaIdKey(' hero-a '),'s:hero-a');
assert.equal(engine.mediaIdKey('   '),null);
assert.equal(engine.mediaIdKey(true),null,'booleans must never alias textual media ids');
assert.equal(engine.mediaIdKey(false),null,'booleans must be invalid media references');
assert.equal(engine.mediaIdKey({id:8}),null,'objects must be invalid media references');
assert.equal(engine.mediaIdKey([8]),null,'arrays must be invalid media references');
assert.equal(engine.mediaIdKey(8.5),null,'fractional numeric media ids must be rejected');
assert.equal(engine.mediaIdKey('8.5'),null,'fractional numeric-looking strings must be rejected');
assert.equal(engine.mediaIdKey(Number.MAX_SAFE_INTEGER+1),null,'unsafe numeric media ids must be rejected');
assert.equal(engine.mediaIdKey(String(Number.MAX_SAFE_INTEGER+1)),null,'unsafe numeric-looking strings must be rejected');
assert.equal(engine.mediaIdKey(-1),null,'negative numeric media ids must be rejected');
assert.equal(engine.assetById(7).id,'007');
assert.equal(engine.assetById('7.0').id,'007');
assert.equal(engine.assetById(' +08.0 ').id,8);
assert.equal(engine.assetById('-0').id,0);
assert.equal(engine.assetById(' hero-a ').id,'hero-a');
assert.equal(engine.assetById(true),undefined,'boolean true must not resolve the string id "true"');
assert.equal(engine.assetById('true').id,'true','explicit textual ids remain valid');

assets.push({id:7,type:'image',blob:{id:'duplicate-seven'}});
assert.equal(engine.assetById(7),undefined,'ambiguous canonical media identities must fail closed');
assert.equal(engine.assetById('7.0'),undefined,'legacy aliases must also fail closed when identity is ambiguous');
assets.pop();
assert.equal(engine.assetById('7.0').id,'007','resolution must recover after ambiguity is removed');

texts.length=0;
await context.renderAt(4.5);
assert.equal(draws.length,4,'blank media references must not accidentally resolve to a real asset');
assert.ok(texts.some(text=>/Editor manual listo/i.test(text)),'blank references should behave like an empty visual slot, not missing media');

console.log('Preview media identity regressions passed');