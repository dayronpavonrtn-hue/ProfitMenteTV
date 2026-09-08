import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {ProfitMenteFrameNudgeEngine:E}=require('./frame-nudge-engine.js');

function clip(id,start,duration=1,track=0,extra={}){return {id,start,duration,track,...extra}}
function project(clips,extra={}){return {fps:30,duration:10,clips,...extra}}
function approx(actual,expected,epsilon=1e-9){assert.ok(Math.abs(actual-expected)<=epsilon,`expected ${actual} ≈ ${expected}`)}

{
  const p=project([clip('a',1),clip('b',2)]);
  const r=E.applySelection(p,['a','b'],1);
  assert.equal(r.ok,true);assert.equal(r.changed,2);assert.equal(r.appliedFrames,1);
  approx(p.clips[0].start,1+1/30);approx(p.clips[1].start,2+1/30);
}

{
  const p=project([clip('a',1,1,0,{groupId:'g'}),clip('b',3,1,1,{groupId:'g'}),clip('c',5)]);
  const r=E.applySelection(p,['a'],10);
  assert.equal(r.ok,true);assert.equal(r.changed,2);
  approx(p.clips[0].start,1+10/30);approx(p.clips[1].start,3+10/30);assert.equal(p.clips[2].start,5);
}

{
  const p=project([clip('a',1),clip('b',2,1,1)],{trackState:{1:{locked:true}}});
  const before=p.clips.map(c=>c.start),r=E.applySelection(p,['a','b'],1);
  assert.equal(r.ok,false);assert.equal(r.reason,'locked');assert.deepEqual(p.clips.map(c=>c.start),before);
}

{
  const p=project([clip('a',1),clip('b',2,1,1,{locked:true})]);
  const before=p.clips.map(c=>c.start),r=E.applySelection(p,['a','b'],1);
  assert.equal(r.ok,false);assert.equal(r.reason,'locked');assert.deepEqual(p.clips.map(c=>c.start),before);
}

{
  const p=project([clip('a',1),clip('b',2)]);
  const r=E.applySelection(p,['a','b'],-100);
  assert.equal(r.ok,true);assert.equal(r.appliedFrames,-30);assert.equal(p.clips[0].start,0);assert.equal(p.clips[1].start,1);
}

{
  const p=project([clip('dup',1),clip('dup',2)]);
  const r=E.applySelection(p,['dup'],1);
  assert.equal(r.ok,false);assert.equal(r.reason,'ambiguous_id');assert.deepEqual(p.clips.map(c=>c.start),[1,2]);
}

{
  const p=project([clip('a',9.5,.5)]);
  const r=E.applySelection(p,['a'],30);
  assert.equal(r.ok,true);assert.equal(p.clips[0].start,10.5);assert.equal(p.duration,11);
}

{
  const p=project([clip('a',1)]);
  for(let i=0;i<30;i++)assert.equal(E.applySelection(p,['a'],1).ok,true);
  approx(p.clips[0].start,2,1e-8);
}

{
  const p=project([clip('a',1)]);
  assert.equal(E.applySelection(p,[{}],1).reason,'invalid_id');
  assert.equal(E.applySelection(p,['a'],1.5).reason,'invalid_frames');
}

console.log('ProfitMente Studio multi-selection frame nudge regression tests: OK');
