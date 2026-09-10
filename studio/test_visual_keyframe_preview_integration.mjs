import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const code=fs.readFileSync(new URL('./visual-keyframe-integration.js',import.meta.url),'utf8');
const transforms=[];
const ctx={
  globalAlpha:1,
  drawImage(){transforms.push(['draw']);},
  save(){transforms.push(['save']);},
  restore(){transforms.push(['restore']);},
  translate(x,y){transforms.push(['translate',x,y]);},
  rotate(v){transforms.push(['rotate',v]);},
  scale(x,y){transforms.push(['scale',x,y]);}
};
const elements=new Map();
function control(id,value='0'){
  const el={id,value,disabled:false,textContent:'',dataset:{},addEventListener(){}};elements.set(`#${id}`,el);return el;
}
for(const [id,value] of [['vkX','0'],['vkY','0'],['vkScale','1'],['vkRotation','0'],['vkOpacity','1'],['playhead','1']])control(id,value);
for(const id of ['vkSet','vkRemove','vkClear','vkInfo'])control(id,'');
const section={className:'',innerHTML:'',dataset:{},remove(){}};
const props={appendChild(){}};
const canvas={width:1000,height:500,getContext(){return ctx}};
const document={
  querySelector(selector){if(selector==='#previewCanvas')return canvas;if(selector==='.props')return props;return elements.get(selector)||null;},
  createElement(){return section;},
  addEventListener(){}
};
class Engine{
  canonicalTrack(v){return Number(v)}
  eligible(c){return c&&[0,1].includes(Number(c.track))}
  clipLocked(){return false}
  normalize(c){return c.visualKeyframes||[]}
  state(){return {x:0,y:0,scale:1,rotation:0,opacity:1}}
  stateAt(c){return c.state||this.state()}
  upsert(){return {ok:true,changed:false,count:0}}
  remove(){return {ok:true,changed:false,count:0}}
  clear(){return {ok:true,changed:false,count:0}}
}
const project={clips:[
  {id:'upper',track:1,start:0.5,duration:2,asset:'shared',state:{x:20,y:0,scale:2,rotation:0,opacity:.5}},
  {id:'lower',track:0,start:0,duration:2,asset:'shared',state:{x:-10,y:0,scale:1.5,rotation:0,opacity:.8}}
]};
const assets=[{id:'shared',type:'video',blob:{size:1}}];
const window={ProfitMenteVisualKeyframeEngine:Engine,addEventListener(){}};
window.renderAt=async()=>{ctx.drawImage({});ctx.drawImage({});};
const context={window,globalThis:window,document,project,assets,requestAnimationFrame(fn){fn()},persist(){},drawTimeline(){},setStatus(){},renderAt:window.renderAt,console,Math,Number,Promise};
vm.createContext(context);
vm.runInContext(code,context,{filename:'visual-keyframe-integration.js'});
assert.ok(window.ProfitMenteVisualKeyframes,'integration should initialize');
const ordered=window.ProfitMenteVisualKeyframes.activeCandidates(1);
assert.deepEqual(Array.from(ordered,c=>c.id),['lower','upper'],'candidates must follow preview compositing order even when sharing one asset');
transforms.length=0;
await window.renderAt(1);
const scales=transforms.filter(x=>x[0]==='scale').map(x=>[x[1],x[2]]);
assert.deepEqual(scales,[[1.5,1.5],[2,2]],'each draw must receive the keyframes of its own clip, not the shared asset identity');
const translations=transforms.filter(x=>x[0]==='translate'&&x[1]!==500);
assert.equal(translations[0][1],400,'lower V1 clip should receive -10% X');
assert.equal(translations[1][1],700,'upper V2 clip should receive +20% X');
assert.equal(Object.prototype.hasOwnProperty.call(window,'assetUrl'),false,'modern preview integration must not depend on legacy assetUrl interception');
console.log('Visual keyframe preview integration OK');
