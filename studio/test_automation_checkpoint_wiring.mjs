import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

class FakeElement{
  constructor(id){this.id=id;this.dataset={};this.listeners=new Map();this.files=[]}
  addEventListener(type,fn,options={}){this.listeners.set(type,{fn,options})}
  fire(type,event={}){const row=this.listeners.get(type);if(row)row.fn({target:this,...event})}
}

const elements=new Map();
const add=id=>{const el=new FakeElement(id);elements.set(id,el);return el};
const generate=add('generateBtn');
const observers=[];
const scheduled=[];
const labels=[];
let saves=0;

class FakeMutationObserver{
  constructor(callback){this.callback=callback;observers.push(this)}
  observe(){}
  disconnect(){}
}
class FakeCustomEvent{constructor(type,init={}){this.type=type;this.detail=init.detail}}

const windowEvents=[];
const context={
  console,
  document:{body:{},getElementById:id=>elements.get(id)||null},
  MutationObserver:FakeMutationObserver,
  CustomEvent:FakeCustomEvent,
  setTimeout:fn=>{scheduled.push(fn);return scheduled.length},
  window:{
    profitMenteProjectVersionEngine:{
      createIfChanged(_project,label){labels.push(label);return {created:true,row:{id:`v${labels.length}`}}}
    },
    dispatchEvent:event=>windowEvents.push(event),
    addEventListener(){}
  },
  save:()=>{saves+=1}
};
context.globalThis=context;

const source=fs.readFileSync(new URL('./automation-checkpoint.js',import.meta.url),'utf8');
vm.runInNewContext(source,context,{filename:'automation-checkpoint.js'});
assert.equal(scheduled.length,1,'checkpoint boot should retry when project is not initialized yet');
assert.equal(generate.dataset.autoCheckpoint,undefined,'must not wire against an undefined project');

context.project={id:'p1',name:'Demo',clips:[]};
scheduled.shift()();
assert.equal(generate.dataset.autoCheckpoint,'1','existing automation controls should wire after project becomes available');
assert.equal(observers.length,1,'dynamic controls should be monitored once');

const autoFinish=add('autoFinishBtn');
const autoFinishRender=add('autoFinishRenderBtn');
observers[0].callback();
assert.equal(autoFinish.dataset.autoCheckpoint,'1');
assert.equal(autoFinishRender.dataset.autoCheckpoint,'1');
assert.equal(autoFinish.listeners.get('click')?.options?.capture,true,'checkpoint must run in capture phase before Auto Finish mutates the project');
assert.equal(autoFinishRender.listeners.get('click')?.options?.capture,true);

autoFinish.fire('click');
autoFinishRender.fire('click');
assert.deepEqual(labels,['Antes de Auto Finish','Antes de Auto Finish + render MP4']);
assert.equal(saves,2,'each protected automation must persist current edits before snapshotting');
assert.equal(windowEvents.length,2);
assert.ok(windowEvents.every(event=>event.type==='profitmente:checkpoint-created'&&event.detail?.automatic===true));

console.log('automation checkpoint wiring ok');
