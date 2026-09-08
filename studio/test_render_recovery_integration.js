'use strict';

const assert=require('assert');
const path=require('path');

function element(id){
  return {
    id,hidden:false,disabled:false,attributes:{},listeners:{},
    setAttribute(name,value){this.attributes[name]=String(value)},
    addEventListener(name,fn){this.listeners[name]=fn},
    insertAdjacentElement(_where,node){nodes.set('#'+node.id,node)},
  };
}

const nodes=new Map();
const renderBtn=element('renderMp4Btn');nodes.set('#renderMp4Btn',renderBtn);
const cancelBtn=element('cancelRenderBtn');nodes.set('#cancelRenderBtn',cancelBtn);
let saved={jobId:'job-123'};
let resumeCalls=0;
let resolveResume;

global.window={
  addEventListener(){},
  ProfitMenteAsyncRenderValidation:{
    readSession(){return saved},
    async resumeSavedJob(){resumeCalls++;return new Promise(resolve=>{resolveResume=resolve})}
  }
};
global.document={
  querySelector(selector){return nodes.get(selector)||null},
  createElement(){return element('')}
};
global.setInterval=()=>0;
global.clearInterval=()=>{};
global.setTimeout=fn=>{fn();return 0};

require(path.join(__dirname,'render-recovery-integration.js'));
const api=window.ProfitMenteRenderRecovery;
const button=nodes.get('#recoverRenderBtn');
assert(api,'recovery integration should expose an API');
assert(button,'recovery button should be created');
assert.strictEqual(button.hidden,false,'button should be visible for a preserved job');
assert.strictEqual(button.disabled,false);

(async()=>{
  const first=api.recover();
  assert.strictEqual(api.recovering,true,'recovery guard should become active');
  assert.strictEqual(button.disabled,true,'button should disable while reconnecting');
  const second=await api.recover();
  assert.strictEqual(second,false,'concurrent recovery should be rejected');
  assert.strictEqual(resumeCalls,1,'only one reconnect attempt may run');
  saved=null;
  resolveResume(true);
  assert.strictEqual(await first,true);
  assert.strictEqual(api.recovering,false);
  assert.strictEqual(button.hidden,true,'button should hide after session is cleared');

  saved={jobId:'job-456'};api.sync();
  assert.strictEqual(button.hidden,false);
  resolveResume=null;
  const clickPromise=button.listeners.click();
  assert.strictEqual(resumeCalls,2,'button should invoke recovery');
  resolveResume(false);await clickPromise;
  assert.strictEqual(button.hidden,false,'recoverable session should remain available after a failed retry');
  console.log('Render recovery integration OK');
})().catch(err=>{console.error(err);process.exitCode=1});
