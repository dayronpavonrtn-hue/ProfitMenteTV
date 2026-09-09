import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('./generator-refill-integration.js',import.meta.url),'utf8');

function makeContext({mode='Automático',fail=false}={}){
  let inserted=null,saves=0,status='';
  const host={insertAdjacentElement(_where,node){inserted=node}};
  const document={
    querySelector(selector){if(selector==='#generateBtn')return host;if(selector==='#playhead')return {value:'0'};return null},
    createElement(){return {id:'',type:'',textContent:'',title:'',disabled:false,addEventListener(_name,fn){this.click=fn}}}
  };
  const project={mode,clips:[{id:'scene',track:0,asset:null},{id:'locked',track:0,asset:null,locked:true}]};
  const assets=[{id:'video-1',type:'video',name:'money-market.mp4',mediaReadable:true}];
  const helper={
    usableAssets(list){return list.filter(a=>a.mediaReadable!==false)},
    async prepareImported(){if(fail)throw new Error('metadata failed')},
    fill(target,all){const clip=target.clips.find(c=>c.id==='scene');clip.asset=all[0].id;return {changed:true,before:1,after:0,primary:1,broll:0,narration:0,music:0,sfx:0}}
  };
  const context={
    console,structuredClone,CustomEvent:class{constructor(type,init){this.type=type;this.detail=init?.detail}},
    document,project,assets,setStatus(value){status=value},save(){saves++},drawTimeline(){},drawLibrary(){},syncForm(){},async renderAt(){},
    window:{ProfitMenteGeneratorAutoFillIntegration:helper,dispatchEvent(){}},globalThis:null
  };
  context.globalThis=context.window;
  vm.runInNewContext(source,context,{filename:'generator-refill-integration.js'});
  return {context,get button(){return inserted},get saves(){return saves},get status(){return status}};
}

{
  const env=makeContext();
  assert.equal(env.button?.id,'refillFromLibraryBtn','refill control must be installed next to generator');
  const result=await env.context.window.ProfitMenteGeneratorRefill.refill();
  assert.equal(result.changed,true);
  assert.equal(env.context.project.clips[0].asset,'video-1','existing local media must fill the missing automatic scene');
  assert.equal(env.context.project.clips[1].asset,null,'locked manual work must remain untouched');
  assert.equal(env.saves,1,'successful refill must persist through Studio save');
  assert.match(env.status,/sin regenerar el guion/i);
}

{
  const env=makeContext({mode:'Manual'});
  const before=structuredClone(env.context.project);
  const result=await env.context.window.ProfitMenteGeneratorRefill.refill();
  assert.equal(result.reason,'manual-mode');
  assert.deepEqual(env.context.project,before,'manual mode must never be mutated by refill');
  assert.equal(env.saves,0);
}

{
  const env=makeContext({fail:true});
  const before=structuredClone(env.context.project);
  const result=await env.context.window.ProfitMenteGeneratorRefill.refill();
  assert.equal(result.reason,'error');
  assert.deepEqual(env.context.project,before,'failed metadata/assignment must roll the project back atomically');
  assert.match(env.status,/restaurado/i);
}

console.log('generator refill tests passed');
