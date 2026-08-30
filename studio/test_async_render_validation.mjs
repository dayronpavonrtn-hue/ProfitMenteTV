import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source=fs.readFileSync(new URL('./render-job-integration.js',import.meta.url),'utf8');
const renderBtn={insertAdjacentElement(){},disabled:false};
const document={
  querySelector(selector){if(selector==='#renderMp4Btn')return renderBtn;if(selector==='#cancelRenderBtn')return null;return null},
  createElement(){return {id:'',type:'button',textContent:'',hidden:false,title:'',disabled:false}}
};
class Client{constructor(){this.jobId=null;this.resultMaxAttempts=3}}
let qcCalls=0;
const context={
  console,document,ProfitMenteRenderJobClient:Client,
  bundler:{qcSummary(qc){qcCalls++;return `QA post-render ${qc.score}/100`}},
  window:{},project:{name:'Test'},setTimeout(){return 0}
};
vm.createContext(context);
vm.runInContext(source,context,{filename:'render-job-integration.js'});
const api=context.window.ProfitMenteAsyncRenderValidation;
const client=context.window.profitMenteRenderJobClient;
assert.ok(api?.validatePostRender,'validation API must be exposed');
assert.throws(()=>api.validatePostRender({status:'done'}),/sin superar el control de calidad post-render/i);
assert.throws(()=>api.validatePostRender({status:'done',qc:{ok:false,score:80}}),/sin superar el control de calidad post-render/i);
assert.equal(api.validatePostRender({status:'done',qc:{ok:true,score:97}}),'QA post-render 97/100');
assert.equal(qcCalls,1,'successful async validation must flow through bundler.qcSummary so the QA report hook runs');
assert.match(api.statusText({status:'queued',progress:10,queue_position:2}),/En cola · posición 2 · 10%/);
assert.doesNotMatch(api.statusText({status:'rendering',progress:35,queue_position:2}),/posición/);
client.jobId='render-123';
assert.equal(api.shouldPreserveSession(Object.assign(new Error('Failed to fetch result'),{retryable:true})),true,'retryable download/network failures must preserve the render job');
assert.equal(api.shouldPreserveSession(Object.assign(new Error('MP4 truncado'),{code:'INVALID_RENDER_RESULT',retryable:true})),true,'invalid/truncated result downloads must preserve the render job');
assert.equal(api.shouldPreserveSession(Object.assign(new Error('Servidor ocupado'),{status:503})),true,'transient server failures must preserve the render job');
assert.equal(api.shouldPreserveSession(new Error('El servidor terminó el MP4 sin superar el control de calidad post-render.')),false,'terminal post-render QA failures must not preserve a bad result');
assert.equal(api.shouldPreserveSession(Object.assign(new Error('Render cancelado'),{name:'AbortError'})),false,'cancelled renders must not be preserved');
client.jobId=null;
assert.equal(api.shouldPreserveSession(Object.assign(new Error('Failed to fetch'),{retryable:true})),false,'there is nothing to preserve before a job id exists');
console.log('Async render post-QA regression passed');
