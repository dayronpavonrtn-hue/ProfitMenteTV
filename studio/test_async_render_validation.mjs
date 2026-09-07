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
  window:{},project:{name:'Test'},assets:[],structuredClone,
  setTimeout(){return 0}
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

// Snapshot identity must preserve legitimate numeric aliases without accepting
// JavaScript coercion from arrays, booleans or objects as real media IDs.
assert.equal(api.canonicalMediaId(7),'7');
assert.equal(api.canonicalMediaId('007'),'7');
assert.equal(api.canonicalMediaId('+07.0'),'7');
assert.equal(api.canonicalMediaId('-0'),'0');
assert.equal(api.canonicalMediaId('camera-A'),'camera-A');
assert.equal(api.canonicalMediaId([7]),'');
assert.equal(api.canonicalMediaId(true),'');
assert.equal(api.canonicalMediaId({value:7}),'');
assert.equal(api.canonicalMediaId(new Number(7)),'');

assert.equal(api.strictFinite(10),10);
assert.equal(api.strictFinite('10.5'),10.5);
assert.equal(api.strictFinite('1e2'),100);
assert.equal(api.strictFinite([10]),null);
assert.equal(api.strictFinite(true),null);
assert.equal(api.strictFinite(new Number(10)),null);
assert.equal(api.strictFinite({value:10}),null);

const identity=api.mediaIdentity([{id:'007',name:'clip.mp4',type:'video',mime:'video/mp4',size:'1200',duration:'3.5',width:'1080',height:1920,sourceLastModified:'123'}])[0];
assert.equal(identity.id,'7');
assert.equal(identity.size,1200);
assert.equal(identity.duration,3.5);
assert.equal(identity.width,1080);
assert.equal(identity.height,1920);
assert.equal(identity.sourceLastModified,123);
const corruptIdentity=api.mediaIdentity([{id:[7],name:{toString(){return 'clip.mp4'}},type:['video'],mime:true,size:[1200],duration:{value:3.5},width:new Number(1080),height:false,sourceLastModified:[123],sourceFingerprint:['fp'],sourceContentHash:{value:'hash'}}])[0];
assert.equal(corruptIdentity.id,'');
assert.equal(corruptIdentity.name,'');
assert.equal(corruptIdentity.type,'');
assert.equal(corruptIdentity.mime,'');
assert.equal(corruptIdentity.size,null);
assert.equal(corruptIdentity.duration,null);
assert.equal(corruptIdentity.width,null);
assert.equal(corruptIdentity.height,null);
assert.equal(corruptIdentity.sourceLastModified,null);
assert.equal(corruptIdentity.sourceFingerprint,'');
assert.equal(corruptIdentity.sourceContentHash,'');

const renderProject={libraryId:'lib-a',name:'Test',clips:[{id:'c1',asset:7,start:0,duration:3}]};
const validAssets=[{id:7,name:'clip.mp4',type:'video',mime:'video/mp4',size:1200,duration:3,width:1080,height:1920,sourceLastModified:123}];
const aliasAssets=[{id:'007',name:'clip.mp4',type:'video',mime:'video/mp4',size:'1200',duration:'3',width:'1080',height:'1920',sourceLastModified:'123'}];
const corruptAssets=[{id:[7],name:'clip.mp4',type:'video',mime:'video/mp4',size:[1200],duration:'3',width:'1080',height:'1920',sourceLastModified:'123'}];
const validFp=api.renderFingerprint(renderProject,validAssets);
assert.equal(api.renderFingerprint(renderProject,aliasAssets),validFp,'legacy scalar aliases should identify the same media snapshot');
assert.notEqual(api.renderFingerprint(renderProject,corruptAssets),validFp,'coercible array metadata must never impersonate the valid render snapshot');
const renderContext={projectName:'Test',libraryId:'lib-a',renderFingerprint:validFp};
assert.equal(api.evaluateRenderFreshness(renderContext,renderProject,aliasAssets).status,'current');
assert.equal(api.evaluateRenderFreshness(renderContext,renderProject,corruptAssets).status,'stale');
assert.equal(api.evaluateRenderFreshness(renderContext,{...renderProject,libraryId:'lib-b'},validAssets).status,'different-project');

console.log('Async render post-QA regression passed');
