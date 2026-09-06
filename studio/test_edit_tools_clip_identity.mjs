import assert from 'node:assert/strict';

globalThis.window=globalThis;
globalThis.requestAnimationFrame=fn=>fn();
globalThis.setStatus=message=>{globalThis.__status=message};
globalThis.project={duration:20,clips:[
  {id:7,track:0,name:'Numeric seven',start:0,duration:4},
  {id:'alpha',track:0,name:'Alpha',start:5,duration:3},
  {id:0,track:1,name:'Zero',start:0,duration:2}
]};

const buttons=new Map();
for(const id of ['splitBtn','duplicateBtn','deleteClipBtn','playhead'])buttons.set(id,{disabled:false,value:'0',addEventListener(){}});
const documentListeners=new Map();
globalThis.document={
  activeElement:{tagName:'BODY',isContentEditable:false},
  querySelector(selector){return selector.startsWith('#')?buttons.get(selector.slice(1))||null:null},
  querySelectorAll(){return []},
  addEventListener(type,handler,options){
    const list=documentListeners.get(type)||[];
    list.push({handler,options});
    documentListeners.set(type,list);
  },
  createElement(){return {setAttribute(){},addEventListener(){}}},
  body:{appendChild(){} }
};

class DummySplit{}
class DummyGroupEdit{}
class DummyGroupSplit{}
globalThis.ProfitMenteSplitEditEngine=DummySplit;
globalThis.ProfitMenteGroupEditEngine=DummyGroupEdit;
globalThis.ProfitMenteGroupSplitEngine=DummyGroupSplit;

await import('./edit-tools.js');

const tools=globalThis.ProfitMenteEditTools;
const identity=globalThis.ProfitMenteClipIdentity;
assert.ok(tools,'edit tools should initialize');
assert.ok(identity,'clip identity helper should be exposed for editor integrations');
assert.equal(identity.key('007'),'n:7');
assert.equal(identity.key('+7.0'),'n:7');
assert.equal(identity.key('-0'),'n:0');
assert.equal(identity.same(7,'007'),true);
assert.equal(identity.same('alpha',' alpha '),true);
assert.equal(identity.same('alpha','ALPHA'),false,'text clip IDs must remain case-sensitive');

tools.select('007');
assert.equal(tools.selectedId,7,'DOM string aliases must resolve to the real numeric clip ID');
assert.equal(globalThis.__status,'Clip seleccionado: Numeric seven');

tools.select('-0');
assert.equal(tools.selectedId,0,'zero IDs must remain selectable instead of being treated as empty');

tools.select(' alpha ');
assert.equal(tools.selectedId,'alpha','text IDs should normalize harmless surrounding whitespace');

const dblclick=documentListeners.get('dblclick')||[];
assert.equal(dblclick.length,1,'manual editor must own one safe clip double-click route');
assert.equal(dblclick[0].options,true,'double-click guard must run in capture phase before legacy target handlers');
let prevented=false,stopped=false;
const clipEl={dataset:{id:'007'},closest(selector){return selector==='.clip'?this:null}};
dblclick[0].handler({
  target:clipEl,
  preventDefault(){prevented=true},
  stopImmediatePropagation(){stopped=true}
});
assert.equal(prevented,true,'safe double-click route must suppress legacy default behavior');
assert.equal(stopped,true,'safe double-click route must stop destructive legacy target handlers');
assert.equal(tools.selectedId,7,'double-click should select the clip for the modern inspector');
assert.match(globalThis.__status,/inspector/i,'double-click should clearly route editing to the inspector');

project.clips.push({id:'7.0',track:2,name:'Ambiguous alias',start:9,duration:1});
tools.select('007');
assert.equal(tools.selectedId,null,'ambiguous canonical clip IDs must not silently select the wrong clip');
assert.match(globalThis.__status,/ambiguo/i);

console.log('edit tools clip identity and safe inspector routing ok');