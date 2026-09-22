const assert=require('assert');
const {ProfitMenteAutoTransitionEngine:Engine}=require('../studio/auto-transition-engine.js');

function clip(id,name,start,transition){return {id,name,track:0,start,duration:3,sceneText:name,transition}}

const project={fps:30,duration:9,clips:[
  clip('a','HOOK',0,'cut'),
  clip('b','PROBLEMA',3,'slide'),
  clip('c','SOLUCIÓN',6,'zoom')
]};

const result=Engine.apply(project,{force:true});
assert.strictEqual(project.clips[0].transition,'cut','first generated scene must remain a cut');
assert.strictEqual(project.clips[1].transition,'slide','valid generator slide must survive synchronization');
assert.strictEqual(project.clips[2].transition,'zoom','valid generator zoom must survive synchronization');
assert.strictEqual(project.clips[1].autoTransition,true);
assert.strictEqual(project.clips[2].autoTransition,true);
assert.ok(project.clips[1].transitionDuration>0);
assert.ok(project.clips[2].transitionDuration>0);
assert.strictEqual(Engine.inspect(project).invalid,0,'synchronized transitions must pass engine inspection');
assert.ok(result.changed>=2,'sync must mark generated transitions as managed');

const invalid={fps:30,duration:6,clips:[clip('x','HOOK',0,'cut'),clip('y','PROBLEMA',3,'spin')]};
Engine.apply(invalid,{force:true});
assert.ok(['fade','slide','zoom'].includes(invalid.clips[1].transition),'unsupported transition must be replaced with a renderable type');
assert.notStrictEqual(invalid.clips[1].transition,'spin');

console.log('PASS auto transition preservation regression');
