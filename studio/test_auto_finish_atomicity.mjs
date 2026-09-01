import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const source=await readFile(new URL('./auto-finish-integration.js',import.meta.url),'utf8');
const elements=new Map();
function button(id){
  const el={id,disabled:false,textContent:'',title:'',onclick:null,dataset:{},click(){this.onclick?.()},insertAdjacentElement(_where,node){elements.set(node.id,node)}};
  elements.set(id,el);return el;
}
button('generateBtn');button('qaBtn');
const playhead=button('playhead');playhead.value='2';
const events=[],statuses=[];
const document={
  body:{},
  querySelector(selector){return selector.startsWith('#')?elements.get(selector.slice(1))||null:null},
  createElement(){return {id:'',type:'',textContent:'',title:'',disabled:false,onclick:null,dataset:{},insertAdjacentElement(_where,node){elements.set(node.id,node)}}}
};
class MutationObserver{constructor(fn){this.fn=fn}observe(){}}
class CustomEvent{constructor(type,init={}){this.type=type;this.detail=init.detail}}
const originalProject={name:'Atomic',duration:10,clips:[{id:'c1',track:0,start:0,duration:5,name:'Original'}]};
const originalAssets=[{id:'a1',name:'original.mp4',type:'video',sourceContentHash:'sha256-original'}];
const originalHistory={limit:80,undoStack:[{name:'Earlier edit',duration:10,clips:[]}],redoStack:[{name:'Redo edit',duration:10,clips:[]}],current:structuredClone(originalProject)};
let historyState=structuredClone(originalHistory),historyImports=0;
const projectHistoryEngine={
  exportState(){return structuredClone(historyState)},
  importState(state){historyState=structuredClone(state);historyImports++;return true}
};
let persistCalls=0,drawTimelineCalls=0,drawLibraryCalls=0,renderCalls=0,legacyHistorySeeds=0;
const context={
  console,structuredClone,document,MutationObserver,CustomEvent,
  project:structuredClone(originalProject),assets:structuredClone(originalAssets),
  setStatus(v){statuses.push(v)},persist(){persistCalls++},drawTimeline(){drawTimelineCalls++},drawLibrary(){drawLibraryCalls++},syncForm(){},async renderAt(){renderCalls++},
  historyEngine:{seed(){legacyHistorySeeds++}},
  window:{
    ProfitMenteAutoFinishEngine:{
      plan(){return {steps:['repair','smart-mix']}},inspect(){return {}}
    },
    ProfitMenteProjectHistory:{engine:projectHistoryEngine},
    ProfitMenteQAAutofix:{repair(project,assets){project.clips[0].name='Mutated';project.clips.push({id:'partial'});assets.push({id:'partial-asset',name:'partial.mp4',type:'video'});return {changed:3}}},
    ProfitMenteSmartMix:{async apply(){historyState={limit:80,undoStack:[...historyState.undoStack,structuredClone(originalProject)],redoStack:[],current:{name:'Partial history state',clips:[{id:'partial'}]}};throw new Error('forced mix failure')}},
    dispatchEvent(event){events.push(event)}
  }
};
context.globalThis=context;context.window.window=context.window;
vm.createContext(context);vm.runInContext(source,context);
const api=context.window.ProfitMenteAutoFinish;
assert.ok(api,'Auto Finish integration must install');
const result=await api.run();
assert.equal(result.error,'forced mix failure');
assert.equal(result.rolledBack,true,'failed automation must report rollback');
assert.deepEqual(context.project,originalProject,'project must be restored after a partial automation failure');
assert.deepEqual(context.assets,originalAssets,'media library must be restored after a partial automation failure');
assert.deepEqual(historyState,originalHistory,'undo/redo history must be restored exactly after automation rollback');
assert.equal(historyImports,1,'modern project history must be restored once');
assert.equal(legacyHistorySeeds,0,'restoring modern history must not erase it through the legacy seed fallback');
assert.ok(persistCalls>=1,'restored state must be persisted');
assert.ok(drawTimelineCalls>=1,'timeline must redraw after rollback');
assert.ok(drawLibraryCalls>=1,'media library must redraw after rollback');
assert.ok(renderCalls>=1,'preview must refresh after rollback');
const rollbackEvent=events.find(e=>e.type==='profitmente:auto-finish-rolled-back');
assert.ok(rollbackEvent,'rollback must publish an observable event');
assert.equal(rollbackEvent.detail.historyRestored,true,'rollback event must confirm history restoration');
assert.ok(statuses.some(s=>/revirti[oó] todos los cambios parciales/i.test(s)),'status must explain that partial changes were reverted');

console.log('auto-finish atomic rollback regression: ok');
