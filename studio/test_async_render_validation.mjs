import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source=fs.readFileSync(new URL('./render-job-integration.js',import.meta.url),'utf8');
const renderBtn={insertAdjacentElement(){},disabled:false};
const document={
  querySelector(selector){if(selector==='#renderMp4Btn')return renderBtn;if(selector==='#cancelRenderBtn')return null;return null},
  createElement(){return {id:'',type:'button',textContent:'',hidden:false,title:'',disabled:false}}
};
class Client{}
let qcCalls=0;
const context={
  console,document,ProfitMenteRenderJobClient:Client,
  bundler:{qcSummary(qc){qcCalls++;return `QA post-render ${qc.score}/100`}},
  window:{},project:{name:'Test'},setTimeout(){return 0}
};
vm.createContext(context);
vm.runInContext(source,context,{filename:'render-job-integration.js'});
const api=context.window.ProfitMenteAsyncRenderValidation;
assert.ok(api?.validatePostRender,'validation API must be exposed');
assert.throws(()=>api.validatePostRender({status:'done'}),/sin superar el control de calidad post-render/i);
assert.throws(()=>api.validatePostRender({status:'done',qc:{ok:false,score:80}}),/sin superar el control de calidad post-render/i);
assert.equal(api.validatePostRender({status:'done',qc:{ok:true,score:97}}),'QA post-render 97/100');
assert.equal(qcCalls,1,'successful async validation must flow through bundler.qcSummary so the QA report hook runs');
assert.match(api.statusText({status:'queued',progress:10,queue_position:2}),/En cola · posición 2 · 10%/);
assert.doesNotMatch(api.statusText({status:'rendering',progress:35,queue_position:2}),/posición/);
console.log('Async render post-QA regression passed');
