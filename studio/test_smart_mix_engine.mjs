import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),Engine=require('./smart-mix-engine.js');

const project={duration:20,trackState:{},clips:[
  {id:'m1',name:'Music 1',track:5,asset:'music',start:0,duration:10,volume:.5,duckVolume:.5,ducking:false},
  {id:'v1',name:'Voice 1',track:6,asset:'voice',start:2,duration:4},
  {id:'v2',name:'Voice overlap',track:6,asset:'voice2',start:4,duration:4},
  {id:'m2',name:'Music 2',track:5,asset:'music2',start:12,duration:5,volume:.4,duckVolume:.3}
]};

let report=Engine.inspect(project);
assert.equal(report.music,2);
assert.equal(report.voice,2);
assert.equal(report.overlapping,1);
assert.equal(report.needsDucking,1);
assert.equal(report.rows[0].overlap,6,'overlapping voice clips must be merged, not double counted');
assert.equal(report.rows[0].coverage,.6);

const applied=Engine.apply(project,{duckRatio:.4});
assert.equal(applied.changed,1);
assert.equal(project.clips[0].ducking,true);
assert.equal(project.clips[0].duckVolume,.2);
assert.equal(project.clips[3].duckVolume,.3,'music without voice overlap must stay untouched');
assert.equal(Engine.inspect(project).needsDucking,0);

const muted=structuredClone(project);
muted.trackState={'6':{muted:true}};
muted.clips[0].duckVolume=.5;
assert.equal(Engine.inspect(muted).voice,0);
assert.equal(Engine.inspect(muted).overlapping,0);
assert.equal(Engine.apply(muted).changed,0);

const disabled=structuredClone(project);
disabled.clips[0].ducking=false;
disabled.clips[0].duckVolume=.05;
assert.equal(Engine.inspect(disabled).needsDucking,1,'disabled ducking must be reported even when stored duck volume is low');
assert.equal(Engine.safeDuckVolume({volume:1},.05),.15,'ratio has a safe lower bound');
assert.equal(Engine.safeDuckVolume({volume:1},.9),.75,'ratio has a safe upper bound');
assert.equal(Engine.safeDuckVolume({volume:.2},.4),.08);

console.log('smart mix regression ok');
