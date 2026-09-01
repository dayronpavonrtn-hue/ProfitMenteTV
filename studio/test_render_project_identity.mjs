import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const SESSION_KEY='profitmente.activeRenderJob.v1';

async function runScenario({resultError=null}={}){
  const store=new Map(),statuses=[];let downloadName=null,capturedProject=null,capturedAssets=null,switched=false;
  const renderBtn={disabled:false,onclick:null,insertAdjacentElement(){}};
  const cancelBtn={hidden:true,disabled:false,onclick:null};
  const document={
    querySelector(sel){if(sel==='#renderMp4Btn')return renderBtn;if(sel==='#cancelRenderBtn')return cancelBtn;if(sel==='#qaBtn')return {click(){}};return null},
    createElement(tag){if(tag==='a')return {href:'',download:'',click(){downloadName=this.download}};return {hidden:false,disabled:false}},
  };
  let context;
  class FakeClient{
    constructor(){this.jobId=null;this.resultMaxAttempts=3}
    async start(){this.jobId='job-original';context.project={name:'Proyecto B',libraryId:'lib-b',clips:[]};context.assets=[{id:'asset-b',name:'b.mp4',type:'video',blob:new Blob(['b'])}];switched=true;return {job_id:this.jobId}}
    async wait(cb){const state={job_id:this.jobId,status:'done',progress:100,qc:{ok:true,score:99}};cb(state);return state}
    async result(){if(resultError)throw resultError;return new Blob(['mp4-data'],{type:'video/mp4'})}
    async status(){return {job_id:this.jobId,status:'rendering'}}
    attach(id){this.jobId=id;return id}
    async cancel(){return {ok:true,status:'cancelled'}}
    reset(){this.jobId=null}
  }
  context={
    console,Blob,structuredClone,ProfitMenteRenderJobClient:FakeClient,document,
    project:{name:'Proyecto A',libraryId:'lib-a',clips:[]},assets:[{id:'asset-a',name:'a.mp4',type:'video',mime:'video/mp4',size:7,sourceContentHash:'sha256-a',blob:new Blob(['asset-a'],{type:'video/mp4'})}],qa:{inspect(){return {issues:[]}}},save(){},
    setStatus(v){statuses.push(v)},
    bundler:{
      async health(){return {ok:true,render_ready:true}},
      async build(project,assets){capturedProject=structuredClone(project);capturedAssets=structuredClone(assets);context.assets.push({id:'late-edit',name:'late.mp4',type:'video',blob:new Blob(['late'])});return new Blob(['tar'],{type:'application/x-tar'})},
      qcSummary(qc){return `QA ${qc.score}/100`},
    },
    localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},
    URL:{createObjectURL(){return 'blob:test'},revokeObjectURL(){}},
    setTimeout(fn){Promise.resolve().then(fn);return 1},clearTimeout(){},window:{},
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(new URL('./render-job-integration.js',import.meta.url),'utf8'),context);
  await new Promise(resolve=>setImmediate(resolve));
  await renderBtn.onclick();
  return {store,statuses,downloadName,capturedProject,capturedAssets,switched,project:context.project,assets:context.assets,validation:context.window.ProfitMenteAsyncRenderValidation};
}

const success=await runScenario();
assert.equal(success.switched,true,'scenario must switch projects while render is active');
assert.equal(success.project.name,'Proyecto B');
assert.equal(success.capturedProject.name,'Proyecto A','render bundle must keep the project snapshot from render start');
assert.equal(success.capturedProject.libraryId,'lib-a');
assert.deepEqual(success.capturedAssets.map(a=>a.id),['asset-a'],'render bundle must keep the media snapshot captured at render start');
assert.notEqual(success.capturedAssets,success.assets,'render assets must not share the live editor array');
assert.equal(success.downloadName,'Proyecto_A.mp4','completed MP4 must keep the original project name');
assert.equal(success.store.has(SESSION_KEY),false,'successful download clears recovery state');
assert.ok(success.statuses.some(v=>/proyecto abierto ahora es otro/.test(v)),'project switch must be visible on the completed result');

const {renderFingerprint,evaluateRenderFreshness,normalizeRenderContext,snapshotAssetsForRender,mediaIdentity}=success.validation;
const original={name:'Proyecto A',libraryId:'lib-a',format:{width:1080,height:1920,fps:30},clips:[{id:'c1',track:0,start:0,duration:4,source:'asset-1'}]};
const sameContent={...structuredClone(original),name:'Renombrado',libraryId:'lib-a'};
const edited=structuredClone(original);edited.clips[0].duration=5;
const other=structuredClone(original);other.libraryId='lib-b';
const originalAssets=[{id:'asset-1',name:'clip.mp4',type:'video',mime:'video/mp4',size:100,sourceLastModified:10,sourceContentHash:'sha256-original',blob:new Blob(['original'])}];
const sameAssets=structuredClone(originalAssets);
const replacedAssets=structuredClone(originalAssets);replacedAssets[0].sourceContentHash='sha256-replaced';replacedAssets[0].size=101;
const fingerprint=renderFingerprint(original);
assert.equal(fingerprint,renderFingerprint(sameContent),'project display name must not invalidate legacy render content');
assert.notEqual(fingerprint,renderFingerprint(edited),'render-affecting edits must change the legacy fingerprint');
const identity=normalizeRenderContext({projectName:'Proyecto A',libraryId:'lib-a',renderFingerprint:fingerprint});
assert.equal(evaluateRenderFreshness(identity,original,originalAssets).status,'current');
assert.equal(evaluateRenderFreshness(identity,sameContent,originalAssets).status,'current');
assert.equal(evaluateRenderFreshness(identity,edited,originalAssets).status,'stale');
assert.equal(evaluateRenderFreshness(identity,other,originalAssets).status,'different-project');
assert.equal(evaluateRenderFreshness({projectName:'Legacy',libraryId:'lib-a'},original,originalAssets).status,'unknown','legacy sessions without fingerprint must remain recoverable without being called current');

const mediaFingerprint=renderFingerprint(original,originalAssets);
assert.ok(mediaFingerprint.startsWith('v2-'),'new render sessions must use media-aware fingerprints');
assert.equal(mediaFingerprint,renderFingerprint(sameContent,sameAssets),'display-only project rename and equivalent media must remain current');
assert.notEqual(mediaFingerprint,renderFingerprint(original,replacedAssets),'replacing media must invalidate the render fingerprint even when the project JSON is unchanged');
const mediaIdentityContext=normalizeRenderContext({projectName:'Proyecto A',libraryId:'lib-a',renderFingerprint:mediaFingerprint});
assert.equal(evaluateRenderFreshness(mediaIdentityContext,original,sameAssets).status,'current');
assert.equal(evaluateRenderFreshness(mediaIdentityContext,original,replacedAssets).status,'stale');
assert.equal(evaluateRenderFreshness(mediaIdentityContext,original,replacedAssets).reason,'content-or-media');
assert.deepEqual(mediaIdentity(originalAssets).map(a=>a.sourceContentHash),['sha256-original']);
const frozen=snapshotAssetsForRender(originalAssets);originalAssets[0].name='changed-live.mp4';originalAssets.push({id:'asset-2',name:'new.mp4'});
assert.equal(frozen.length,1,'media snapshot must not grow when the live library changes');
assert.equal(frozen[0].name,'clip.mp4','media snapshot metadata must not mutate with the live library');

const networkError=Object.assign(new Error('network download failed'),{retryable:true});
const failed=await runScenario({resultError:networkError});
const saved=JSON.parse(failed.store.get(SESSION_KEY));
assert.equal(saved.jobId,'job-original');
assert.equal(saved.projectName,'Proyecto A','recovery session must keep original render project name');
assert.equal(saved.libraryId,'lib-a','recovery session must keep original project identity');
assert.ok(saved.renderFingerprint?.startsWith('v2-'),'recovery session must preserve the media-aware render snapshot fingerprint');
assert.ok(failed.statuses.some(v=>/se conserva para recuperación/.test(v)));

console.log('render project and media snapshot identity guard ok');
