import assert from 'node:assert/strict';

globalThis.window=globalThis;
window.ProfitMenteAutoFinishEngine={inspect(){return null},plan(){return {steps:[]}}};
globalThis.document={querySelector(){return null},body:{}};
globalThis.MutationObserver=class{observe(){}};
globalThis.project={duration:10,clips:[]};
globalThis.assets=[];

await import('./auto-finish-integration.js?render-wait-regression');
const bridge=window.ProfitMenteAutoFinish?.startLocalRenderAndWait;
assert.equal(typeof bridge,'function','Auto Finish must expose the local render bridge');

let release;
const gate=new Promise(resolve=>{release=resolve});
let entered=false;
let finished=false;
let disabledDuringHandler=false;
const button={
  disabled:false,
  async onclick(){
    entered=true;
    disabledDuringHandler=this.disabled;
    await gate;
    finished=true;
  },
  click(){throw new Error('direct click should not be used when an async onclick handler exists')}
};

const pending=bridge(button);
await Promise.resolve();
assert.equal(entered,true,'render handler should start');
assert.equal(disabledDuringHandler,true,'render control must be locked before the async handler begins');
assert.equal(button.disabled,true,'render control must remain disabled while render is pending');
assert.equal(finished,false,'bridge must not resolve before the render handler completes');
release();
const completed=await pending;
assert.deepEqual(completed,{started:true,awaited:true});
assert.equal(finished,true,'render handler should complete before the bridge resolves');
assert.equal(button.disabled,false,'render control must be restored after completion');

let busyInvocations=0;
const busyButton={disabled:true,onclick:async()=>{busyInvocations++}};
assert.deepEqual(await bridge(busyButton),{started:false,awaited:false});
assert.equal(busyInvocations,0,'an already-busy render control must not be invoked again');

let fallbackClicks=0;
const fallbackButton={disabled:false,onclick:null,click(){fallbackClicks++}};
assert.deepEqual(await bridge(fallbackButton),{started:true,awaited:false});
assert.equal(fallbackClicks,1,'fallback click path should remain compatible with non-function handlers');

console.log('auto-finish render wait regression: ok');
