import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const Engine=require('./webm-render-engine.js');

const check=input=>Engine.shouldBlockEditEvent(input);
assert.equal(check({active:false,type:'click',withinEditor:true}),false);
assert.equal(check({active:true,type:'click',withinEditor:false}),false);
assert.equal(check({active:true,type:'click',targetId:'cancelWebmBtn',withinEditor:true}),false);
assert.equal(check({active:true,type:'keydown',key:'Escape',withinEditor:true}),false);
for(const type of ['click','dblclick','pointerdown','input','change','paste','drop','submit']){
  assert.equal(check({active:true,type,targetId:'projectName',withinEditor:true}),true);
}
for(const key of ['z','s','ArrowLeft','ArrowRight']){
  assert.equal(check({active:true,type:'keydown',key,withinEditor:true}),true);
}
assert.equal(check({active:true,type:'mousemove',withinEditor:true}),false);
assert.equal(check({active:true,type:'wheel',withinEditor:true}),false);
const engine=new Engine();
const session=engine.begin({projectName:'QA'});
assert.equal(engine.active,true);
assert.equal(engine.cancel(),true);
assert.equal(engine.cancelled,true);
assert.throws(()=>engine.assert(session),error=>error?.name==='AbortError');
engine.reset();
assert.equal(engine.active,false);
console.log('WebM render edit lock QA OK');
