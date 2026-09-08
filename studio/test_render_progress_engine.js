'use strict';
const assert=require('node:assert/strict');
const engine=require('./render-progress-engine.js');

assert.equal(engine.numeric(42),42);
assert.equal(engine.numeric(' 42.5 '),42.5);
for(const value of [true,false,[],[42],{},new Number(42),Infinity,'Infinity','42px',''])assert.equal(engine.numeric(value),null);

assert.equal(engine.percentOf(-4),0);
assert.equal(engine.percentOf(128),100);
assert.equal(engine.percentOf('37.5'),37.5);
assert.equal(engine.percentOf(true),null);
assert.equal(engine.secondsOf(-1),null);
assert.equal(engine.secondsOf('12.25'),12.25);

assert.equal(Math.round(engine.etaOf(25,10)),30);
assert.equal(engine.etaOf(0,10),null);
assert.equal(engine.etaOf(100,10),null);

let state=engine.normalize({status:'rendering',progress:'50',elapsed:'20'});
assert.equal(state.stage,'rendering');
assert.equal(state.progress,50);
assert.equal(state.elapsed,20);
assert.equal(state.eta,20);
assert.equal(state.indeterminate,false);
assert.equal(state.terminal,false);

state=engine.normalize({stage:'queued',progress:null});
assert.equal(state.stage,'queued');
assert.equal(state.progress,null);
assert.equal(state.indeterminate,true);

state=engine.normalize({stage:'done',progress:100});
assert.equal(state.stage,'done');
assert.equal(state.terminal,true);

state=engine.normalize({stage:'not-a-real-stage',progress:12});
assert.equal(state.stage,'rendering');
assert.equal(state.progress,12);

state=engine.normalize({stage:'rendering',progress:[],elapsed:{},progress_stale:true});
assert.equal(state.progress,null);
assert.equal(state.elapsed,null);
assert.equal(state.stale,true);

assert.equal(engine.formatSeconds(9.25),'9.3s');
assert.equal(engine.formatSeconds(65),'1m 05s');
assert.equal(engine.formatSeconds({}),'');

console.log('Render progress engine OK');
