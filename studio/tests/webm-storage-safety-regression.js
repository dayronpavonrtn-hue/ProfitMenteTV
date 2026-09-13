'use strict';

const assert=require('assert');

(async()=>{
  let captureCalls=0;
  let status='';
  let cancelButton=null;
  let storedPrimary=null;
  const renderButton={disabled:false,onclick:null,insertAdjacentElement(_where,node){cancelButton=node}};
  const canvas={
    width:1080,height:1920,dataset:{},
    captureStream(){captureCalls++;return {getVideoTracks(){return []},getTracks(){return []}}}
  };
  const playhead={value:'0'};

  global.window=global;
  global.document={
    body:{dataset:{},setAttribute(){},removeAttribute(){},appendChild(){}},
    scripts:[],
    querySelector(selector){
      if(selector==='#renderBtn')return renderButton;
      if(selector==='#previewCanvas')return canvas;
      if(selector==='#cancelWebmBtn')return cancelButton;
      if(selector==='#playhead')return playhead;
      if(selector==='#format')return {value:'9:16'};
      return null;
    },
    createElement(){return {hidden:false,disabled:false,addEventListener(){},click(){this.onclick?.()}}},
    addEventListener(){}
  };
  global.addEventListener=()=>{};
  global.setStatus=value=>{status=String(value)};
  global.project={name:'WebM storage safety',duration:1,format:'9:16',fps:30,renderQuality:'high'};
  global.assets=[];
  global.MediaRecorder=function MediaRecorder(){};
  global.ProfitMenteStartupProjectGuard={
    PRIMARY_KEY:'profitmente-project',
    serializeProject(target){return {raw:JSON.stringify(target)}}
  };
  global.localStorage={
    getItem(key){
      if(key==='profitmente-project')return storedPrimary;
      if(key==='profitmente-preview-quality')throw new Error('SecurityError');
      return null;
    }
  };

  class Engine{
    constructor(){this.active=false;this.cancelled=false}
    reset(){this.active=false}
    cancel(){return false}
    static normalizeFps(value){return Number(value)||30}
    static captureState(){return {}}
    static framePlan(){return {fps:30,totalFrames:1,duration:1,frameDuration:1,timeAt(){return 0}}}
    static mimeType(){return ''}
    static normalizeQuality(value){return value}
    static recorderOptions(){return {}}
    static shouldBlockEditEvent(){return false}
    static shouldWarnBeforeUnload(){return false}
  }
  global.ProfitMenteWebMRenderEngine=Engine;

  global.save=()=>{throw new Error('persistent storage unavailable')};
  require('../webm-render-integration.js');
  assert(global.ProfitMenteWebMRender,'WebM integration must initialize');

  await global.ProfitMenteWebMRender.run();
  assert.strictEqual(captureCalls,0,'WebM render must not capture frames when project save throws');
  assert.match(status,/cancelado.*guardado del proyecto/i,'save exception must be reported as a controlled export cancellation');

  global.save=()=>true;
  storedPrimary='{"stale":true}';
  status='';
  await global.ProfitMenteWebMRender.run();
  assert.strictEqual(captureCalls,0,'WebM render must not capture frames when save returns but persistent storage stayed stale');
  assert.match(status,/cancelado.*guardado del proyecto/i,'silent persistence failure must be reported before codec/render work');

  storedPrimary=JSON.stringify(global.project);
  status='';
  await global.ProfitMenteWebMRender.run();
  assert.strictEqual(captureCalls,0,'quality storage fallback must not start capture when no codec is available');
  assert.match(status,/códec WebM compatible/i,'quality preference read failure must fall back safely after persistence is verified');

  global.ProfitMenteProjectAutosave={unsaved:true,lastError:new Error('autosave pending')};
  status='';
  await global.ProfitMenteWebMRender.run();
  assert.strictEqual(captureCalls,0,'WebM render must not start while autosave reports unsaved changes');
  assert.match(status,/autosave pending/i,'autosave durability failure must surface its reason');

  console.log('webm storage safety regression: OK');
})().catch(error=>{console.error(error);process.exitCode=1});