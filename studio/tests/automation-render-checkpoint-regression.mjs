import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../automation-checkpoint.js',import.meta.url),'utf8');
const ids=['renderBtn','renderMp4Btn','bundleBtn','exportBtn'];
const elements=new Map();
for(const id of ids){
  const listeners=[];
  elements.set(id,{id,dataset:{},addEventListener(type,fn,options){listeners.push({type,fn,options})},click(){for(const row of listeners.filter(x=>x.type==='click'))row.fn({target:this})},listeners});
}
const body={appendChild(){},};
const document={
  scripts:[],body,
  getElementById(id){return elements.get(id)||null},
  createElement(){return {dataset:{},set src(v){this._src=v},get src(){return this._src}}}
};
const calls=[];
const context={
  console,document,project:{id:'p1',name:'Proyecto'},save(){calls.push('save')},setStatus(){},
  window:null,globalThis:null,
  MutationObserver:class{observe(){}},
  CustomEvent:class{constructor(type,init){this.type=type;this.detail=init?.detail}},
  setTimeout(){return 0}
};
context.window=context;context.globalThis=context;
context.addEventListener=()=>{};context.dispatchEvent=()=>{};
context.profitMenteProjectVersionEngine={createIfChanged(project,label){calls.push(label);return {created:false}}};
vm.createContext(context);vm.runInContext(source,context,{filename:'automation-checkpoint.js'});

for(const id of ids){
  const el=elements.get(id);
  assert.equal(el.dataset.autoCheckpoint,'1',`${id} must be protected by automatic versioning`);
  const listener=el.listeners.find(x=>x.type==='click');
  assert.ok(listener,`${id} must register a checkpoint listener`);
  assert.equal(listener.options?.capture,true,`${id} checkpoint must run before the render/export handler`);
  el.click();
}
assert.equal(calls.filter(x=>x==='save').length,ids.length,'each protected action must save before checkpointing');
for(const label of ['Antes de render WebM','Antes de render MP4','Antes de exportar paquete MP4','Antes de exportar proyecto'])assert.ok(calls.includes(label),`missing checkpoint: ${label}`);
console.log('automation render checkpoint regression OK');
