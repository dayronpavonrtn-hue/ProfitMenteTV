import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const SESSION_KEY='profitmente.activeRenderJob.v1';
const store=new Map([[SESSION_KEY,JSON.stringify({jobId:'job-recover',projectName:'Recovered Project',savedAt:Date.now()})]]);
const statuses=[];let clicked=false;let attached=null;
const renderBtn={disabled:false,insertAdjacentElement(){}};
const cancelBtn={hidden:true,disabled:false};
const document={
  querySelector(sel){if(sel==='#renderMp4Btn')return renderBtn;if(sel==='#cancelRenderBtn')return cancelBtn;return null},
  createElement(tag){if(tag==='a')return {href:'',download:'',click(){clicked=true}};return {hidden:false,disabled:false}},
};
class FakeClient{
  constructor(){this.jobId=null;this.cancelled=false}
  attach(id){attached=id;this.jobId=id;return id}
  async status(){return {job_id:this.jobId,status:'rendering',progress:70}}
  async wait(cb){const state={job_id:this.jobId,status:'done',progress:100,qc:{ok:true,score:97}};cb(state);return state}
  async result(){return new Blob(['mp4-data'],{type:'video/mp4'})}
  async start(){throw new Error('not expected')}
  async cancel(){return {ok:true,status:'cancelled'}}
  reset(){this.jobId=null;this.cancelled=false}
}
const context={
  console,Blob,ProfitMenteRenderJobClient:FakeClient,
  document,project:{name:'Current Project'},assets:[],qa:{inspect(){return {issues:[]}}},save(){},
  setStatus(v){statuses.push(v)},bundler:{qcSummary(qc){return `QA ${qc.score}/100`}},
  localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},
  URL:{createObjectURL(){return 'blob:test'},revokeObjectURL(){}},
  setTimeout(fn){Promise.resolve().then(fn);return 1},clearTimeout(){},window:{},
};
vm.createContext(context);
vm.runInContext(fs.readFileSync(new URL('./render-job-integration.js',import.meta.url),'utf8'),context);
await new Promise(resolve=>setImmediate(resolve));
await new Promise(resolve=>setImmediate(resolve));
assert.equal(attached,'job-recover');
assert.equal(clicked,true);
assert.equal(store.has(SESSION_KEY),false);
assert.equal(renderBtn.disabled,false);
assert.equal(cancelBtn.hidden,true);
assert.ok(statuses.some(v=>/Reconectando/.test(v)));
assert.ok(statuses.some(v=>/MP4 final descargado/.test(v)));
console.log('render job recovery ok');
