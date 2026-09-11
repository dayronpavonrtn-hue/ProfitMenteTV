const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const Engine=require('./source-window-engine.js');
const close=(a,b)=>Math.abs(a-b)<1e-9;

let r=Engine.normalize({duration:8,speed:2,sourceOffset:1},{duration:10},{projectRemaining:20,edited:'speed'});
assert(close(r.duration,4.5),'speed increase must shorten timeline duration to available source');
assert(close(r.sourceOffset,1));
assert(close(r.sourceEnd,10));
assert(r.limitedBySource);

r=Engine.normalize({duration:6,speed:1,sourceOffset:8},{duration:10},{projectRemaining:20,edited:'sourceOffset'});
assert(close(r.sourceOffset,4),'slip must clamp so the full clip still fits');
assert(close(r.duration,6));
assert(close(r.sourceEnd,10));

r=Engine.normalize({duration:20,speed:.5,sourceOffset:2},{duration:8},{projectRemaining:30,edited:'duration'});
assert(close(r.duration,12),'duration edit must stop at end of source at current speed');
assert(close(r.sourceEnd,8));

r=Engine.normalize({duration:8,speed:1,sourceOffset:0},{duration:60},{projectRemaining:5,edited:'duration'});
assert(close(r.duration,5),'project boundary must still be enforced');
assert(!r.limitedBySource);

r=Engine.normalize({duration:3,speed:'99',sourceOffset:-5},{duration:20},{projectRemaining:10,edited:'speed'});
assert(close(r.speed,4));
assert(close(r.sourceOffset,0));
assert(close(r.duration,3));

r=Engine.normalize({duration:2,speed:1,sourceOffset:0},{},{projectRemaining:1.25,edited:'duration'});
assert(close(r.duration,1.25),'unknown asset duration must not invent a source boundary');

// Browser regression: ProfitMente Studio declares project/assets with top-level lexical
// bindings, so they do not necessarily exist as globalThis.project/globalThis.assets.
// The inspector must still reconcile the selected clip against those live bindings.
const browser={
  console,
  queueMicrotask(fn){fn()},
  document:{
    addEventListener(){},
    querySelector(){return {value:'0'}}
  },
  persistCalls:0,
  timelineCalls:0,
  renderCalls:0,
  persist(){this.persistCalls++},
  drawTimeline(){this.timelineCalls++},
  renderAt(){this.renderCalls++},
  setStatus(){}
};
browser.window=browser;
const context=vm.createContext(browser);
vm.runInContext(`
  let project={
    duration:20,
    clips:[{id:'clip-1',asset:'asset-1',start:0,duration:8,speed:2,sourceOffset:1}]
  };
  let assets=[{id:'asset-1',type:'video',duration:10}];
  globalThis.ProfitMenteEditTools={selectedId:'clip-1'};
`,context);
assert.strictEqual(context.project,undefined,'lexical project must not be exposed as globalThis.project');
assert.strictEqual(context.assets,undefined,'lexical assets must not be exposed as globalThis.assets');
vm.runInContext(fs.readFileSync(path.join(__dirname,'source-window-engine.js'),'utf8'),context);
vm.runInContext(`
  globalThis.__sourceWindowResult=ProfitMenteSourceWindowEngine.reconcileSelected('speed');
  globalThis.__sourceWindowClip=project.clips[0];
`,context);
assert(context.__sourceWindowResult.changed,'inspector must reconcile against lexical Studio bindings');
assert(close(context.__sourceWindowClip.duration,4.5),'lexical binding reconciliation must clamp to real source duration');
assert(close(context.__sourceWindowClip.sourceOffset,1));
assert.strictEqual(context.persistCalls,1,'source-window reconciliation must persist the repaired clip');
assert.strictEqual(context.timelineCalls,1,'source-window reconciliation must redraw the timeline');
assert.strictEqual(context.renderCalls,1,'source-window reconciliation must refresh preview');

console.log('Source window safety regression: OK');
