import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {ProfitMenteAutoTransitionEngine:Engine}=require('./auto-transition-engine.js');

const legacy={fps:'30',clips:[
  {id:'a',track:'0',sceneText:'a',start:'0',duration:'2'},
  {id:'b',track:'+0.0',sceneText:'b',start:'2.0',duration:'2.0'}
]};
const legacyResult=Engine.apply(legacy);
assert.equal(legacyResult.invalidGeometry,0,'numeric legacy strings must remain compatible');
assert.equal(legacy.clips[1].autoTransition,true);
assert.equal(Engine.inspect(legacy).invalidGeometry,0);

for(const bad of [true,false,'',[],[2],{},NaN,Infinity,-Infinity,null,undefined]){
  const project={fps:30,clips:[
    {id:'a',track:0,sceneText:'a',start:0,duration:2},
    {id:'b',track:0,sceneText:'b',start:bad,duration:2,transition:'zoom',transitionDuration:.2,autoTransition:true}
  ]};
  const result=Engine.apply(project);
  assert.equal(result.invalidGeometry,1,`invalid start must be reported: ${String(bad)}`);
  assert.equal(project.clips[1].transition,'cut','invalid geometry must never keep an automatic transition');
  assert.equal(project.clips[1].transitionDuration,undefined);
  assert.ok(Engine.inspect(project).invalidGeometry>=1);
}

for(const bad of [true,false,'',[],[2],{},NaN,Infinity,-Infinity,0,-1,null,undefined]){
  const project={fps:30,clips:[
    {id:'a',track:0,sceneText:'a',start:0,duration:2},
    {id:'b',track:0,sceneText:'b',start:2,duration:bad}
  ]};
  const before=structuredClone(project.clips[1]);
  const result=Engine.apply(project);
  assert.equal(result.invalidGeometry,1,`invalid duration must be reported: ${String(bad)}`);
  assert.deepEqual(project.clips[1],before,'invalid manual geometry must not be rewritten');
}

const badTransition={fps:30,clips:[
  {id:'a',track:0,sceneText:'a',start:0,duration:2},
  {id:'b',track:0,sceneText:'b',start:2,duration:2,transition:'fade',transitionDuration:true,autoTransition:true}
]};
assert.equal(Engine.inspect(badTransition).invalid,1,'boolean transition duration must not coerce to one second');
const repaired=Engine.apply(badTransition);
assert.equal(repaired.invalidGeometry,0);
assert.equal(typeof badTransition.clips[1].transitionDuration,'number');
assert.notEqual(badTransition.clips[1].transitionDuration,1);
assert.equal(Engine.inspect(badTransition).invalid,0);

const invalidPrevious={fps:30,clips:[
  {id:'a',track:0,sceneText:'a',start:0,duration:true},
  {id:'b',track:0,sceneText:'b',start:2,duration:2,transition:'slide',transitionDuration:.2,autoTransition:true}
]};
const invalidPreviousResult=Engine.apply(invalidPrevious);
assert.equal(invalidPreviousResult.invalidGeometry,1);
assert.equal(invalidPrevious.clips[1].transition,'cut','a valid clip must not bridge from corrupt previous geometry');

console.log('auto-transition strict geometry regression: ok');