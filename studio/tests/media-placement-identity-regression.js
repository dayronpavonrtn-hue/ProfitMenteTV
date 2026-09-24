const fs=require('fs');
const vm=require('vm');
const assert=require('assert');

const source=fs.readFileSync(require('path').join(__dirname,'..','media-placement-integration.js'),'utf8');
const listeners={};
const library={addEventListener:(name,fn)=>listeners[`library:${name}`]=fn,insertAdjacentElement(){}};
const tracks={addEventListener:(name,fn)=>listeners[`tracks:${name}`]=fn};
const modeNodes=[];
const document={
  querySelector(sel){if(sel==='#mediaLibrary')return library;if(sel==='#tracks')return tracks;if(sel==='.mediaLibraryTools')return null;if(sel==='#playhead')return {value:'0'};return null},
  createElement(){const node={dataset:{},style:{},children:[],appendChild(){},set innerHTML(v){this._html=v},get innerHTML(){return this._html}};modeNodes.push(node);return node},
  head:{appendChild(){}},
};
const project={duration:10,clips:[]};
const engine={
  strictFinite(v){const n=typeof v==='number'?v:Number(v);return Number.isFinite(n)?n:null},
  trackKey(v){const n=Number(v);return Number.isInteger(n)&&n>=0&&n<=6?String(n):null},
  trackLocked(){return false},
  range(p,at,duration){return {start:at,end:at+duration,duration,total:p.duration,valid:true}},
  requiredDurationForInsert(p,t,at,d){return Math.max(p.duration,at+d)},
  transaction(p,fn){const before=JSON.parse(JSON.stringify(p));const value=fn();if(value===false||value?.ok===false){Object.assign(p,before);return {ok:false,reason:value?.reason}}return {ok:true,value}},
  insertSpace(){return {ok:true}},overwriteRange(){return {ok:true}},
};
const context={document,project,assets:[],console,structuredClone:global.structuredClone,globalThis:null,window:{ProfitMenteMediaPlacementEngine:engine,ProfitMenteTimelineOps:{split(){},trimLeft(){},trimRight(){}},ProfitMenteMediaTimelineDnD:{assetUsable:a=>!!a?.blob,canDrop:()=>true}},setStatus(){},crypto:{randomUUID:()=> 'clip-id'}};
context.globalThis=context;vm.createContext(context);vm.runInContext(source,context);
const api=context.window.ProfitMenteMediaPlacement;assert(api,'placement API should initialize');
const before=JSON.stringify(project);
assert.strictEqual(api.place({name:'missing-id.mp4',type:'video',blob:{size:10}},0,0,2),false,'asset without identity must be rejected');
assert.strictEqual(JSON.stringify(project),before,'rejected asset must not mutate project');
assert.strictEqual(api.place({id:'   ',name:'blank-id.mp4',type:'video',blob:{size:10}},0,0,2),false,'blank identity must be rejected');
assert.strictEqual(JSON.stringify(project),before,'blank identity must not mutate project');
assert.strictEqual(api.place({id:42,name:'numeric.mp4',type:'video',blob:{size:10}},0,0,2),true,'numeric identity should canonicalize and remain valid');
assert.strictEqual(project.clips.length,1);assert.strictEqual(project.clips[0].asset,'42');
const duplicateA={id:'duplicate',name:'first.mp4',type:'video',blob:{size:10}},duplicateB={id:'duplicate',name:'second.mp4',type:'video',blob:{size:10}};
context.assets.push(duplicateA,duplicateB);const beforeDuplicate=JSON.stringify(project);
assert.strictEqual(api.findAsset('duplicate'),null,'ambiguous library identity must not resolve to an arbitrary asset');
assert.strictEqual(api.assetIdentityUnique(duplicateA),false,'duplicate identity must be reported as unsafe');
assert.strictEqual(api.place(duplicateA,0,2,2),false,'duplicate identity must not be placed directly');
assert.strictEqual(JSON.stringify(project),beforeDuplicate,'duplicate identity rejection must not mutate project');
console.log('media placement identity regression: ok');
