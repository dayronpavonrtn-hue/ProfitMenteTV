import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('./render-job-integration.js',import.meta.url),'utf8');
const bootstrap=fs.readFileSync(new URL('./feature-bootstrap.js',import.meta.url),'utf8');
const preflightPos=bootstrap.indexOf("['export-preflight.js','ProfitMenteExportPreflight']");
const renderPos=bootstrap.indexOf("['render-job-integration.js','ProfitMenteRenderJobs']");
assert.ok(preflightPos>=0&&renderPos>=0&&preflightPos<renderPos,'export preflight must load before MP4 render integration');

async function scenario(preflight){
  const statuses=[];let started=0,healthCalls=0,qaClicks=0,built=0;
  const renderBtn={disabled:false,onclick:null,insertAdjacentElement(){}};
  const cancelBtn={hidden:true,disabled:false,onclick:null};
  const qaBtn={click(){qaClicks++}};
  const document={
    querySelector(sel){if(sel==='#renderMp4Btn')return renderBtn;if(sel==='#cancelRenderBtn')return cancelBtn;if(sel==='#qaBtn')return qaBtn;return null},
    createElement(tag){if(tag==='a')return {href:'',download:'',click(){}};return {hidden:false,disabled:false}},
  };
  class FakeClient{
    constructor(){this.jobId=null;this.resultMaxAttempts=3}
    async start(){started++;this.jobId='job-1';return {job_id:this.jobId}}
    async wait(){return {status:'done',progress:100,qc:{ok:true,score:100}}}
    async result(){return new Blob(['0000ftypisom'],{type:'video/mp4'})}
    reset(){this.jobId=null}
    async cancel(){return {ok:true,status:'cancelled'}}
  }
  const context={
    console,Blob,structuredClone,ProfitMenteRenderJobClient:FakeClient,document,
    project:{name:'Gate QA',libraryId:'gate-1',clips:[]},assets:[],qa:{inspect(){throw new Error('legacy QA path should not run when canonical preflight exists')}},save(){},
    setStatus(v){statuses.push(v)},
    bundler:{async health(){healthCalls++;return {ok:true,render_ready:true}},async build(){built++;return new Blob(['tar'])},qcSummary(){return 'QA post-render 100/100'}},
    localStorage:{getItem(){return null},setItem(){},removeItem(){}},URL:{createObjectURL(){return 'blob:test'},revokeObjectURL(){}},
    setTimeout(){return 1},clearTimeout(){},window:{ProfitMenteExportPreflightRun:async()=>structuredClone(preflight)},
  };
  vm.createContext(context);vm.runInContext(source,context);await renderBtn.onclick();
  return {statuses,started,healthCalls,qaClicks,built};
}

const blocked=await scenario({state:'blocked',canRender:false,canPackage:false,issues:['medio faltante'],health:{ok:true,render_ready:true}});
assert.equal(blocked.started,0,'blocked preflight must never start a render job');
assert.equal(blocked.built,0,'blocked preflight must never build a render bundle');
assert.equal(blocked.qaClicks,1,'blocked QA must surface the QA report');
assert.ok(blocked.statuses.some(x=>/bloqueado por Preflight/.test(x)));

const packageOnly=await scenario({state:'package',canRender:false,canPackage:true,issues:[],health:{ok:false,render_ready:false}});
assert.equal(packageOnly.started,0,'package-only readiness must not start MP4 render');
assert.equal(packageOnly.qaClicks,0,'package-only state is not a QA failure');
assert.ok(packageOnly.statuses.some(x=>/paquete \$0 sigue disponible/.test(x)));

const ready=await scenario({state:'ready',canRender:true,canPackage:true,issues:[],health:{ok:true,render_ready:true}});
assert.equal(ready.started,1,'ready preflight must allow MP4 render');
assert.equal(ready.built,1,'ready preflight must build exactly one render bundle');
assert.equal(ready.healthCalls,0,'render must reuse health already verified by preflight');
assert.equal(ready.qaClicks,0);

console.log('canonical MP4 preflight gate ok');
