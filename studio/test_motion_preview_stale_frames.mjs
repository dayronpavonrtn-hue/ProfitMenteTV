import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source=fs.readFileSync(new URL('./motion-text-engine.js',import.meta.url),'utf8');
const draws=[];
const project={trackState:{},duration:3,clips:[
  {id:'old',track:2,name:'OLD FRAME',start:0,duration:1,textAnimation:'none'},
  {id:'new',track:2,name:'NEW FRAME',start:1,duration:1,textAnimation:'none'}
]};
const canvas={width:540,height:960};
const ctx={
  save(){},restore(){},translate(){},scale(){},fillRect(){},strokeText(){},
  fillText(text){draws.push(text)},measureText(text){return {width:String(text).length*20}},
  set globalAlpha(v){},set textAlign(v){},set textBaseline(v){},set font(v){},
  set fillStyle(v){},set lineWidth(v){},set strokeStyle(v){}
};
const elements=new Map();
const element=()=>({hidden:false,value:'',textContent:'',after(){},appendChild(){},addEventListener(){},closest(){return null}});
const document={
  activeElement:null,
  querySelector(sel){if(!elements.has(sel))elements.set(sel,element());return elements.get(sel)},
  createElement(){return element()},
  addEventListener(){}
};
let epoch=0;
const previewEngine={get renderEpoch(){return epoch}};
const window={ProfitMentePreviewEngine:previewEngine};
window.renderAt=function(t){epoch++;return new Promise(resolve=>setTimeout(resolve,t<1?50:5))};
const context={
  console,setTimeout,clearTimeout,setInterval(){return 1},requestAnimationFrame(fn){fn()},
  document,window,project,canvas,ctx,crypto:{randomUUID(){return 'id'}},
  persist(){},drawTimeline(){},setStatus(){},renderAt:window.renderAt
};
vm.createContext(context);
vm.runInContext(source,context,{filename:'motion-text-engine.js'});

const first=window.renderAt(.5);
await new Promise(r=>setTimeout(r,1));
const second=window.renderAt(1.5);
await Promise.all([first,second]);

assert.deepEqual(draws,['NEW FRAME'],'a stale Motion render must never paint over the newest preview frame');
assert.equal(epoch,2,'preview epoch should advance for both render requests');
console.log('Motion preview stale-frame guard regression passed');
