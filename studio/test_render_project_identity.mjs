import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const SESSION_KEY='profitmente.activeRenderJob.v1';

async function runScenario({resultError=null}={}){
  const store=new Map(),statuses=[];let downloadName=null,capturedProject=null,switched=false;
  const renderBtn={disabled:false,onclick:null,insertAdjacentElement(){}};
  const cancelBtn={hidden:true,disabled:false,onclick:null};
  const document={
    querySelector(sel){if(sel==='#renderMp4Btn')return renderBtn;if(sel==='#cancelRenderBtn')return cancelBtn;if(sel==='#qaBtn')return {click(){}};return null},
    createElement(tag){if(tag==='a')return {href:'',download:'',click(){downloadName=this.download}};return {hidden:false,disabled:false}},
  };
  let context;
  class FakeClient{
    constructor(){this.jobId=null;this.resultMaxAttempts=3}
    async start(){this.jobId='job-original';context.project={name:'Proyecto B',libraryId:'lib-b',clips:[]};switched=true;return {job_id:this.jobId}}
    async wait(cb){const state={job_id:this.jobId,status:'done',progress:100,qc:{ok:true,score:99}};cb(state);return state}
    async result(){if(resultError)throw resultError;return new Blob(['mp4-data'],{type:'video/mp4'})}
    async status(){return {job_id:this.jobId,status:'rendering'}}
    attach(id){this.jobId=id;return id}
    async cancel(){return {ok:true,status:'cancelled'}}
    reset(){this.jobId=null}
  }
  context={
    console,Blob,structuredClone,ProfitMenteRenderJobClient:FakeClient,document,
    project:{name:'Proyecto A',libraryId:'lib-a',clips:[]},assets:[],qa:{inspect(){return {issues:[]}}},save(){},
    setStatus(v){statuses.push(v)},
    bundler:{
      async health(){return {ok:true,render_ready:true}},
      async build(project){capturedProject=structuredClone(project);return new Blob(['tar'],{type:'application/x-tar'})},
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
  return {store,statuses,downloadName,capturedProject,switched,project:context.project,validation:context.window.ProfitMenteAsyncRenderValidation};
}

const success=await runScenario();
assert.equal(success.switched,true,'scenario must switch projects while render is active');
assert.equal(success.project.name,'Proyecto B');
assert.equal(success.capturedProject.name,'Proyecto A','render bundle must keep the project snapshot from render start');
assert.equal(success.capturedProject.libraryId,'lib-a');
assert.equal(success.downloadName,'Proyecto_A.mp4','completed MP4 must keep the original project name');
assert.equal(success.store.has(SESSION_KEY),false,'successful download clears recovery state');
assert.ok(success.statuses.some(v=>/proyecto abierto ahora es otro/.test(v)),'project switch must be visible on the completed result');

const {renderFingerprint,evaluateRenderFreshness,normalizeRenderContext}=success.validation;
const original={name:'Proyecto A',libraryId:'lib-a',format:{width:1080,height:1920,fps:30},clips:[{id:'c1',track:0,start:0,duration:4,source:'asset-1'}]};
const sameContent={...structuredClone(original),name:'Renombrado',libraryId:'lib-a'};
const edited=structuredClone(original);edited.clips[0].duration=5;
const other=structuredClone(original);other.libraryId='lib-b';
const fingerprint=renderFingerprint(original);
assert.equal(fingerprint,renderFingerprint(sameContent),'project display name must not invalidate render content');
assert.notEqual(fingerprint,renderFingerprint(edited),'render-affecting edits must change the fingerprint');
const identity=normalizeRenderContext({projectName:'Proyecto A',libraryId:'lib-a',renderFingerprint:fingerprint});
assert.equal(evaluateRenderFreshness(identity,original).status,'current');
assert.equal(evaluateRenderFreshness(identity,sameContent).status,'current');
assert.equal(evaluateRenderFreshness(identity,edited).status,'stale');
assert.equal(evaluateRenderFreshness(identity,other).status,'different-project');
assert.equal(evaluateRenderFreshness({projectName:'Legacy',libraryId:'lib-a'},original).status,'unknown','legacy sessions without fingerprint must remain recoverable without being called current');

const networkError=Object.assign(new Error('network download failed'),{retryable:true});
const failed=await runScenario({resultError:networkError});
const saved=JSON.parse(failed.store.get(SESSION_KEY));
assert.equal(saved.jobId,'job-original');
assert.equal(saved.projectName,'Proyecto A','recovery session must keep original render project name');
assert.equal(saved.libraryId,'lib-a','recovery session must keep original project identity');
assert.ok(saved.renderFingerprint,'recovery session must preserve the exact render snapshot fingerprint');
assert.ok(failed.statuses.some(v=>/se conserva para recuperación/.test(v)));

console.log('render project identity and stale-result guard ok');
