const assert=require('assert');
const {ProfitMenteTransitionClipboardEngine:Engine}=require('./transition-clipboard-engine.js');
const project={clips:[
  {id:'a',track:0,duration:4,transition:'fade',transitionDuration:.3,transitionDurationAuto:false,autoTransition:false},
  {id:'b',track:0,duration:.2,transition:'cut'},
  {id:'audio',track:5,duration:2,transition:'fade'}
]};
const copied=Engine.copy(project,'a');assert.equal(copied.ok,true);assert.deepEqual(copied.data,{type:'fade',duration:.3,durationAuto:false,autoTransition:false});
let pasted=Engine.paste(project,'b',copied.data);assert.equal(pasted.reason,'ok');assert.equal(pasted.changed,1);assert.equal(project.clips[1].transition,'fade');assert.equal(project.clips[1].transitionDuration,.2,'duration must clamp to destination clip');
assert.equal(Engine.copy(project,'audio').reason,'no-selection','audio clips are not transition targets');
project.clips[1].locked=true;pasted=Engine.paste(project,'b',{type:'zoom',duration:.1});assert.equal(pasted.reason,'locked');assert.equal(project.clips[1].transition,'fade');
project.clips[1].locked=false;pasted=Engine.paste(project,'b',{type:'bogus'});assert.equal(pasted.reason,'invalid-clipboard');
pasted=Engine.paste(project,'b',{type:'cut'});assert.equal(pasted.reason,'ok');assert.equal(project.clips[1].transition,'cut');assert.equal(project.clips[1].transitionDuration,undefined);

const strictProject={clips:[
  {id:'1',track:0,duration:1,transition:'fade',transitionDuration:.2},
  {id:'bool-track',track:true,duration:1,transition:'zoom'},
  {id:false,track:0,duration:1,transition:'slide'}
]};
assert.equal(Engine.copy(strictProject,1).ok,true,'numeric and numeric-string clip ids remain canonically compatible');
assert.equal(Engine.copy(strictProject,false).reason,'no-selection','boolean selected ids must never alias clip identities');
assert.equal(Engine.copy(strictProject,'bool-track').reason,'no-selection','boolean track values must never alias visual tracks');
const invalidDuration=Engine.paste(strictProject,'1',{type:'zoom',duration:true});
assert.equal(invalidDuration.reason,'ok');assert.equal(strictProject.clips[0].transition,'zoom');assert.equal(strictProject.clips[0].transitionDuration,undefined,'boolean durations must not be coerced into seconds');
assert.equal(Engine.numeric([]),null,'object-like numeric values must be rejected');
assert.equal(Engine.canonicalTrack(true),null,'boolean tracks must be rejected');
assert.equal(Engine.idKey(false),null,'boolean ids must be rejected');
console.log('transition clipboard regression: ok');
