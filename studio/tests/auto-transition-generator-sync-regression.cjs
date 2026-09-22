const assert=require('node:assert/strict');
const {ProfitMenteAutoTransitionEngine:Engine}=require('../auto-transition-engine.js');

const project={fps:30,duration:18,clips:[
  {id:'a',track:0,name:'HOOK',sceneText:'hook',start:0,duration:6,transition:'cut'},
  {id:'b',track:0,name:'PROBLEMA',sceneText:'problem',start:6,duration:6,transition:'none'},
  {id:'c',track:0,name:'SOLUCIÓN',sceneText:'solution',start:12,duration:6,transition:'none'}
]};

const result=Engine.apply(project,{force:true});
assert.ok(result.changed>=2,'automatic generation sync should repair generated transitions');
for(const clip of project.clips.slice(1)){
  assert.ok(['fade','slide','zoom'].includes(clip.transition),`unexpected transition: ${clip.transition}`);
  assert.equal(clip.autoTransition,true,'generated transition must be marked automatic');
  assert.ok(Number(clip.transitionDuration)>0,'generated transition needs a renderable duration');
}
assert.equal(project.clips[0].transition,'cut');
console.log('auto-transition generator sync regression: ok');
