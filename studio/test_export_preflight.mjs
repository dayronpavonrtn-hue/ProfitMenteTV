import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const src=fs.readFileSync(new URL('./export-preflight.js',import.meta.url),'utf8');const ctx={globalThis:{},window:undefined,document:undefined,module:{exports:{}}};vm.createContext(ctx);vm.runInContext(src,ctx);const P=ctx.globalThis.ProfitMenteExportPreflight;assert.ok(P);
let r=P.summarize({ok:true,score:100,issues:[],warnings:[],metrics:{clips:3}},{ok:true,render_ready:true});assert.equal(r.state,'ready');assert.equal(r.canRender,true);assert.equal(r.canPackage,true);
r=P.summarize({ok:true,score:93,issues:[],warnings:['baja resolución'],metrics:{}},{ok:true,render_ready:true});assert.equal(r.state,'warning');assert.equal(r.canRender,true);
r=P.summarize({ok:true,score:100,issues:[],warnings:[],metrics:{}},{ok:false,render_ready:false});assert.equal(r.state,'package');assert.equal(r.canPackage,true);assert.equal(r.canRender,false);
r=P.summarize({ok:false,score:50,issues:['medio faltante'],warnings:[],metrics:{}},{ok:true,render_ready:true});assert.equal(r.state,'blocked');assert.equal(r.canPackage,false);assert.equal(r.canRender,false);

async function browserScenario({useSnapshot=false}={}){
  const liveProject={name:'Race guard',clips:[]},liveAssets=[{id:'asset-1',name:'base.mp4'}];
  const btn={disabled:false,onclick:null},report={hidden:true,dataset:{},innerHTML:''},qaBtn={after(){}},status={after(){}};
  let inspectedProject=null,inspectedAssets=null,saves=0;
  class QAEngine{inspect(projectValue,assetValue){inspectedProject=structuredClone(projectValue);inspectedAssets=structuredClone(assetValue);return {ok:true,score:100,issues:[],warnings:[],metrics:{clips:projectValue.clips?.length||0}}}}
  class BundleEngine{async health(){liveProject.clips.push({id:'late-edit'});liveAssets.push({id:'asset-late',name:'late.mp4'});return {ok:true,render_ready:true}}}
  const document={querySelector(sel){if(sel==='#qaBtn')return qaBtn;if(sel==='#preflightBtn')return btn;if(sel==='#preflightReport')return report;if(sel==='#status')return status;return null},createElement(){return {}}};
  const browser={window:{},document,ProfitMenteQAEngine:QAEngine,ProfitMenteBundleEngine:BundleEngine,project:liveProject,assets:liveAssets,save(){saves++},setStatus(){},structuredClone,console,module:undefined};
  vm.createContext(browser);vm.runInContext(src,browser);
  const snapshot={project:{name:'Snapshot',clips:[]},assets:[{id:'snap-asset'}]};
  const result=await browser.window.ProfitMenteExportPreflightRun(useSnapshot?snapshot:undefined);
  return {result,inspectedProject,inspectedAssets,saves,liveProject,liveAssets};
}

const guarded=await browserScenario();
assert.equal(guarded.saves,1,'interactive preflight must save before capturing live state');
assert.equal(guarded.inspectedProject.clips.length,0,'QA must inspect the project before the late edit');
assert.equal(guarded.result.state,'blocked','a project changed while health is pending must be blocked');
assert.equal(guarded.result.canRender,false,'changed live state must never reach MP4 render');
assert.ok(guarded.result.issues.some(x=>/cambió durante el Preflight/.test(x)));

const snap=await browserScenario({useSnapshot:true});
assert.equal(snap.saves,0,'explicit render snapshots must not trigger another live save');
assert.equal(snap.inspectedProject.name,'Snapshot');
assert.deepEqual(snap.inspectedAssets.map(x=>x.id),['snap-asset']);
assert.equal(snap.result.state,'ready','an explicit immutable snapshot remains valid even if the live editor changes');
assert.equal(snap.result.canRender,true);

console.log('Export preflight QA OK');
