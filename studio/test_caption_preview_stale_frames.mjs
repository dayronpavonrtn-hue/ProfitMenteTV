import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source=fs.readFileSync(new URL('./caption-preview.js',import.meta.url),'utf8');
const painted=[];
const project={trackState:{},trackStates:{},clips:[
  {id:'old',track:3,start:0,duration:1,name:'old',wordTimings:[{word:'alpha',start:0,end:1,duration:1}]},
  {id:'new',track:3,start:1,duration:1,name:'new',wordTimings:[{word:'beta',start:1,end:2,duration:1}]}
]};
const canvas={width:540,height:960};
const ctx={
  save(){},restore(){},fillRect(){},strokeText(){},measureText(text){return {width:String(text).length*24}},
  fillText(text){painted.push(String(text))},
  set textAlign(v){},set textBaseline(v){},set font(v){},set fillStyle(v){},set lineWidth(v){},set strokeStyle(v){}
};
async function baseRender(t){
  await new Promise(resolve=>setTimeout(resolve,t<1?50:5));
}
const context={
  console,setTimeout,clearTimeout,project,canvas,ctx,renderAt:baseRender,
  window:{ProfitMentePreviewEngine:{activeCaptions(t){return project.clips.filter(c=>t>=c.start&&t<c.start+c.duration)}}}
};
vm.createContext(context);
vm.runInContext(source,context,{filename:'caption-preview.js'});

const oldRender=context.renderAt(.5);
await new Promise(resolve=>setTimeout(resolve,1));
const newRender=context.renderAt(1.5);
await Promise.all([oldRender,newRender]);

assert.deepEqual(painted,['BETA'],'an obsolete async caption render must never paint over the newest preview frame');
assert.equal(context.window.ProfitMenteCaptionPreview.renderEpoch,2,'caption render epoch must advance once per preview request');

painted.length=0;
project.trackStates={'03':{hidden:true}};
await context.renderAt(1.5);
assert.deepEqual(painted,[],'legacy hidden caption-track aliases must still suppress word overlays');

project.trackStates={};
await context.renderAt(.5);
assert.deepEqual(painted,['ALPHA'],'a current non-stale caption request should continue drawing normally');

console.log('Caption preview stale-frame regressions passed');
