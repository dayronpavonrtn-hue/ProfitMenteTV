import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const renderBtn={disabled:false,onclick:null,insertAdjacentElement(){}};
const cancelBtn={hidden:true,disabled:false,onclick:null};
class FakeClient{constructor(){this.jobId=null;this.resultMaxAttempts=3}reset(){this.jobId=null}}
const context={
  console,structuredClone,Blob,ProfitMenteRenderJobClient:FakeClient,
  document:{querySelector(sel){if(sel==='#renderMp4Btn')return renderBtn;if(sel==='#cancelRenderBtn')return cancelBtn;return null},createElement(){return {}}},
  project:{name:'P',libraryId:'lib',clips:[]},assets:[],qa:{inspect(){return {issues:[]}}},bundler:{},save(){},setStatus(){},
  localStorage:{getItem(){return null},setItem(){},removeItem(){}},URL:{createObjectURL(){return 'blob:test'},revokeObjectURL(){}},
  setTimeout(){return 1},clearTimeout(){},window:{},
};
vm.createContext(context);
vm.runInContext(fs.readFileSync(new URL('./render-job-integration.js',import.meta.url),'utf8'),context);

const api=context.window.ProfitMenteAsyncRenderValidation;
assert.ok(api,'render validation API must be exported');
const {canonicalMediaId,mediaIdentity,renderFingerprint,evaluateRenderFreshness}=api;

assert.equal(canonicalMediaId(0),'0','numeric media id 0 must not collapse to empty');
assert.equal(canonicalMediaId('00'),'0');
assert.equal(canonicalMediaId('0.0'),'0');
assert.equal(canonicalMediaId(7),'7');
assert.equal(canonicalMediaId('07'),'7');
assert.equal(canonicalMediaId('7.0'),'7');
assert.equal(canonicalMediaId(' asset-a '),'asset-a','text ids should be trimmed without reinterpretation');
assert.equal(canonicalMediaId(null),'');
assert.equal(canonicalMediaId(undefined),'');

const aliases=[
  [{id:0,name:'zero.mp4',type:'video',size:10,sourceContentHash:'h0'}],
  [{id:'00',name:'zero.mp4',type:'video',size:10,sourceContentHash:'h0'}],
  [{id:'0.0',name:'zero.mp4',type:'video',size:10,sourceContentHash:'h0'}],
];
for(const list of aliases)assert.deepEqual(mediaIdentity(list).map(a=>a.id),['0']);

const project={name:'P',libraryId:'lib',format:{width:1080,height:1920,fps:30},clips:[{id:'c',asset:0,track:0,start:0,duration:1}]};
const a0={id:0,name:'zero.mp4',type:'video',mime:'video/mp4',size:10,sourceContentHash:'hash-zero'};
const a00={...a0,id:'00'};
const aText={...a0,id:'asset-zero'};
const fp0=renderFingerprint(project,[a0]);
assert.equal(fp0,renderFingerprint(project,[a00]),'numeric aliases for the same media must produce the same render fingerprint');
assert.notEqual(fp0,renderFingerprint(project,[aText]),'id 0 must remain distinct from a text media id');
assert.notEqual(fp0,renderFingerprint(project,[{...a0,id:null}]),'id 0 must remain distinct from a missing id');

const saved={projectName:'P',libraryId:'lib',renderFingerprint:fp0};
assert.equal(evaluateRenderFreshness(saved,project,[a00]).status,'current','alias-only id representation changes must not make a completed render stale');
assert.equal(evaluateRenderFreshness(saved,project,[{...a0,sourceContentHash:'changed'}]).status,'stale','real media replacement must still invalidate freshness');

const mixed=mediaIdentity([{id:'07',name:'b.mp4'},{id:0,name:'a.mp4'},{id:'7.0',name:'a2.mp4'}]);
assert.deepEqual(mixed.map(a=>a.id),['0','7','7'],'media identity sorting must use canonical ids');

console.log('render canonical media identity guard ok');
