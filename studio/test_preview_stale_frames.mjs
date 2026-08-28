import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source=fs.readFileSync(new URL('./preview-engine.js',import.meta.url),'utf8');
const draws=[];

class MockImage{
  constructor(){this.naturalWidth=1080;this.naturalHeight=1920;this.width=1080;this.height=1920;this.onload=null;this.onerror=null;this._id='';}
  set src(value){this._id=value;setTimeout(()=>this.onload?.(),value.includes('slow')?50:5)}
  get src(){return this._id}
}

const ctx={
  clearRect(){},fillRect(){},fillText(){},strokeText(){},save(){},restore(){},translate(){},rotate(){},scale(){},measureText(){return {width:100}},
  drawImage(source){draws.push(source._id||source.src||'unknown')},
  set fillStyle(v){},set font(v){},set textAlign(v){},set textBaseline(v){},set lineWidth(v){},set strokeStyle(v){},set globalAlpha(v){},set filter(v){}
};
const placeholder={hidden:false};
const canvas={width:540,height:960};
const assets=[
  {id:'slow',type:'image',blob:{id:'slow'}},
  {id:'fast',type:'image',blob:{id:'fast'}}
];
const project={mode:'Manual',trackState:{},clips:[
  {id:'c1',track:0,asset:'slow',start:0,duration:1,name:'slow'},
  {id:'c2',track:0,asset:'fast',start:1,duration:1,name:'fast'}
]};
const context={
  console,setTimeout,clearTimeout,Image:MockImage,assets,project,canvas,ctx,renderAt:()=>{},
  $:()=>placeholder,
  URL:{createObjectURL(blob){return `blob:${blob.id}`},revokeObjectURL(){}},
  document:{createElement(){throw new Error('video not expected in this regression')}},
  window:{}
};
vm.createContext(context);
vm.runInContext(source,context,{filename:'preview-engine.js'});

const first=context.renderAt(.5);
await new Promise(r=>setTimeout(r,1));
const second=context.renderAt(1.5);
await Promise.all([first,second]);

assert.equal(draws.length,1,'only the newest async preview render may draw');
assert.match(draws[0],/fast/,'the newest requested frame must win');
assert.ok(context.window.ProfitMentePreviewEngine.renderEpoch>=2,'render epoch should advance per request');
console.log('Preview stale-frame guard regression passed');
