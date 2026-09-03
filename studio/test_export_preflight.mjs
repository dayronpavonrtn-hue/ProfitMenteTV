import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const src=fs.readFileSync(new URL('./export-preflight.js',import.meta.url),'utf8');const ctx={globalThis:{},window:undefined,document:undefined,module:{exports:{}}};vm.createContext(ctx);vm.runInContext(src,ctx);const P=ctx.globalThis.ProfitMenteExportPreflight;assert.ok(P);
let r=P.summarize({ok:true,score:100,issues:[],warnings:[],metrics:{clips:3}},{ok:true,render_ready:true});assert.equal(r.state,'ready');assert.equal(r.canRender,true);assert.equal(r.canPackage,true);
r=P.summarize({ok:true,score:93,issues:[],warnings:['baja resolución'],metrics:{}},{ok:true,render_ready:true});assert.equal(r.state,'warning');assert.equal(r.canRender,true);
r=P.summarize({ok:true,score:100,issues:[],warnings:[],metrics:{}},{ok:false,render_ready:false});assert.equal(r.state,'package');assert.equal(r.canPackage,true);assert.equal(r.canRender,false);
r=P.summarize({ok:false,score:50,issues:['medio faltante'],warnings:[],metrics:{}},{ok:true,render_ready:true});assert.equal(r.state,'blocked');assert.equal(r.canPackage,false);assert.equal(r.canRender,false);

const cleanQa=()=>({ok:true,score:100,issues:[],warnings:[],metrics:{clips:1}});
let narration=P.narrationCoverage(cleanQa(),{mode:'Automático',duration:30,clips:[{track:6,start:0,duration:8,asset:'voice'}]});
assert.equal(narration.metrics.narrationCoverage,26.7,'short narration coverage must be measured');
assert.ok(narration.warnings.some(x=>/Narración automática incompleta/.test(x)),'short automatic narration must be surfaced before render');
narration=P.narrationCoverage(cleanQa(),{mode:'Automático',duration:30,clips:[{track:6,start:0,duration:30,asset:null,pending:true}]});
assert.equal(narration.metrics.narrationCoverage,0);
assert.ok(narration.warnings.some(x=>/Narración automática pendiente/.test(x)),'pending automatic narration must be surfaced');
narration=P.narrationCoverage(cleanQa(),{mode:'Automático',duration:30,clips:[{track:6,start:0,duration:21.6,asset:'voice'}]});
assert.equal(narration.metrics.narrationCoverage,72);
assert.equal(narration.warnings.length,0,'72 percent narration coverage must satisfy the generator quality threshold');
narration=P.narrationCoverage(cleanQa(),{mode:'Manual',duration:30,clips:[{track:6,start:0,duration:8,asset:'voice'}]});
assert.equal(narration.metrics.narrationCoverage,26.7);
assert.equal(narration.warnings.length,0,'manual editing must not inherit automatic narration requirements');
narration=P.narrationCoverage(cleanQa(),{mode:'Automático',duration:30,trackStates:{6:{muted:true}},clips:[{track:6,start:0,duration:8,asset:'voice'}]});
assert.equal(narration.metrics.narrationCoverage,0);
assert.equal(narration.warnings.length,0,'an intentionally muted narration track must not create a duplicate quality warning');
narration=P.narrationCoverage(cleanQa(),{mode:'Automático',duration:30,trackStates:{'6.0':{muted:true}},clips:[{track:6,start:0,duration:30,asset:'voice'}]});
assert.equal(narration.metrics.narrationCoverage,0,'legacy decimal narration track aliases must honor mute during export preflight');
assert.equal(narration.warnings.length,0);
narration=P.narrationCoverage(cleanQa(),{mode:'Automático',duration:30,trackState:{5:{solo:true},6:{solo:false}},clips:[{track:6,start:0,duration:30,asset:'voice'}]});
assert.equal(narration.metrics.narrationCoverage,0,'narration excluded by modern audio Solo must not count toward export coverage');
assert.equal(narration.warnings.length,0,'a narration track intentionally excluded by Solo must not create a duplicate warning');
narration=P.narrationCoverage(cleanQa(),{mode:'Automático',duration:30,trackStates:{'5.00':{solo:true}},clips:[{track:6,start:0,duration:30,asset:'voice'}]});
assert.equal(narration.metrics.narrationCoverage,0,'legacy decimal Solo aliases on another audio track must exclude narration');
assert.equal(narration.warnings.length,0);
narration=P.narrationCoverage(cleanQa(),{mode:'Automático',duration:30,trackStates:{4:{solo:true}},clips:[{track:6,start:0,duration:30,asset:'voice'}]});
assert.equal(narration.metrics.narrationCoverage,0,'legacy audio Solo must also exclude narration from export coverage');
assert.equal(narration.warnings.length,0);
narration=P.narrationCoverage(cleanQa(),{mode:'Automático',duration:30,trackState:{6:{solo:true}},trackStates:{5:{muted:true}},clips:[{track:6,start:0,duration:30,asset:'voice'}]});
assert.equal(narration.metrics.narrationCoverage,100,'Solo narration must remain active when other audio tracks are muted');
assert.equal(narration.warnings.length,0);
narration=P.narrationCoverage(cleanQa(),{mode:'Automático',duration:30,trackState:{'6':{solo:false},'6.0':{solo:true}},clips:[{track:6,start:0,duration:30,asset:'voice'}]});
assert.equal(narration.metrics.narrationCoverage,100,'equivalent aliases must preserve a true Solo flag instead of losing it to alias ordering');
assert.equal(narration.warnings.length,0);
narration=P.narrationCoverage(cleanQa(),{mode:'Automático',duration:30,trackState:{6:{muted:true,_soloAudioActive:true,_soloMutedBase:false,solo:false},5:{solo:true}},clips:[{track:6,start:0,duration:30,asset:'voice'}]});
assert.equal(narration.metrics.narrationCoverage,0,'synthetic mute generated by Solo must remain excluded without being mistaken for a base mute');
assert.equal(narration.warnings.length,0);
narration=P.narrationCoverage(cleanQa(),{mode:'Automático',duration:30,clips:[{track:6,start:0,duration:20,asset:'a'},{track:6,start:10,duration:20,asset:'b'}]});
assert.equal(narration.metrics.narrationCoverage,100,'overlapping narration clips must not double-count coverage');
assert.equal(narration.warnings.length,0);

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
