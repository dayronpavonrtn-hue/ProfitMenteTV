import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('./bundle-render-job-integration.js',import.meta.url),'utf8');
const index=fs.readFileSync(new URL('./index.html',import.meta.url),'utf8');

const calls=[];
class FakeClient{
  constructor(){this.requestTimeoutMs=25;this.resultTimeoutMs=50;this.resultMaxAttempts=3;this.jobId=null;}
  async fetchWithTimeout(url,options,timeout){calls.push(['fetch',url,timeout,options?.method||'GET']);if(url==='/api/health')return {ok:true,json:async()=>({ok:true,render_ready:true,render_jobs:true})};if(url==='/api/render')return {ok:true,headers:{get:()=> 'passed'},blob:async()=>new Blob([new Uint8Array([0,0,0,20,102,116,121,112,...new Array(20).fill(0)])],{type:'video/mp4'})};throw new Error('unexpected fetch '+url)}
  reset(){calls.push(['reset']);this.jobId=null;}
  async start(){calls.push(['start']);this.jobId='job-1';return {job_id:'job-1'};}
  async wait(onProgress){calls.push(['wait']);onProgress({status:'reconnecting',retry:1,retryDelay:1000});onProgress({status:'rendering',progress:55,elapsed:2});return {status:'done',qc:{ok:true,score:100,metrics:{width:1080,height:1920,duration:1,video_codec:'h264',audio_codec:'aac'}}};}
  async result({onRetry}={}){calls.push(['result']);onRetry?.({nextAttempt:2});return new Blob([new Uint8Array([0,0,0,20,102,116,121,112,...new Array(20).fill(0)])],{type:'video/mp4'});}
  async cancel(){calls.push(['cancel']);return {status:'cancelled'};}
  async validateResultBlob(blob){calls.push(['validate']);return blob;}
}
class FakeBundle{
  constructor(){this.currentJobId=null;this.cancelRequested=false;}
  setCancelVisible(value){calls.push(['cancelVisible',value]);}
  qcSummary(){return 'QA post-render 100/100';}
  sleep(){return Promise.resolve();}
  downloadMp4(blob){calls.push(['download',blob.size]);return blob.size;}
  async errorFrom(){return 'http error';}
}
const context={globalThis:null,ProfitMenteBundleEngine:FakeBundle,ProfitMenteRenderJobClient:FakeClient,Blob,console};context.globalThis=context;
vm.runInNewContext(source,context,{filename:'bundle-render-job-integration.js'});

assert.match(index,/bundle-engine\.js[\s\S]*render-job-client\.js[\s\S]*bundle-render-job-integration\.js[\s\S]*app\.js/,'resilient render client must load before the app creates the bundler');
const bundle=new FakeBundle();
const health=await bundle.health();
assert.equal(health.render_ready,true);
assert.deepEqual(calls[0],['fetch','/api/health',25,'GET']);

const statuses=[];
const size=await bundle.renderJob({name:'test'},new Blob(['bundle']),s=>statuses.push(s));
assert.ok(size>0);
assert.ok(calls.some(x=>x[0]==='start'),'async job must use the resilient client start path');
assert.ok(calls.some(x=>x[0]==='wait'),'async job must use the resilient client polling path');
assert.ok(calls.some(x=>x[0]==='result'),'async job must use the resilient client result path');
assert.ok(statuses.some(x=>/Reconectando/.test(x)),'reconnect state must surface in Studio status');
assert.ok(statuses.some(x=>/Reintentando descarga/.test(x)),'result retry must surface in Studio status');
assert.equal(bundle.currentJobId,null,'finished job must clear active identity');

bundle._renderJobClient=new FakeClient();bundle._renderJobClient.jobId='job-cancel';
assert.equal(await bundle.cancelLocal(()=>{}),true);
assert.ok(calls.some(x=>x[0]==='cancel'),'cancel must use timeout-aware job client');

const legacy=new FakeBundle();
const legacySize=await legacy.renderLegacy({name:'legacy'},new Blob(['bundle']),()=>{});
assert.ok(legacySize>0);
assert.ok(calls.some(x=>x[0]==='fetch'&&x[1]==='/api/render'&&x[2]===50),'legacy render must also use the bounded result timeout');
assert.ok(calls.some(x=>x[0]==='validate'),'legacy MP4 must pass result integrity validation');

console.log('bundle render job integration regression: ok');
