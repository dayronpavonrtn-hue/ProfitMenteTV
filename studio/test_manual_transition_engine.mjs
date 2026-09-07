import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {ProfitMenteManualTransitionEngine:Engine}=require('./manual-transition-engine.js');

const base=()=>({duration:12,trackState:{},clips:[
  {id:'a',track:0,start:0,duration:2,transition:'cut'},
  {id:'b',track:0,start:2,duration:1,transition:'cut'},
  {id:'c',track:1,start:3,duration:4,transition:'cut'},
  {id:'caption',track:3,start:0,duration:2,transition:'cut'}
]});

{
  const p=base(),r=Engine.apply(p,{scope:'selected',selectedId:'b',type:'fade',duration:'0.30'});
  assert.equal(r.changed,1);assert.equal(p.clips[1].transition,'fade');assert.equal(p.clips[1].transitionDuration,.3);assert.equal(p.clips[1].transitionDurationAuto,false);assert.equal(p.clips[1].autoTransition,false);assert.equal(p.clips[0].transition,'cut');
}
{
  const p=base(),r=Engine.apply(p,{scope:'track',selectedId:'b',type:'slide',duration:'auto'});
  assert.equal(r.targets,2);assert.equal(r.changed,2);assert.equal(p.clips[0].transition,'slide');assert.equal(p.clips[1].transition,'slide');assert.equal(p.clips[0].transitionDurationAuto,true);assert.equal(p.clips[2].transition,'cut');
}
{
  const p=base();p.clips[1].locked=true;p.trackState['1']={locked:true};const r=Engine.apply(p,{scope:'all',selectedId:'b',type:'zoom',duration:'0.45'});
  assert.equal(r.targets,3);assert.equal(r.changed,1);assert.equal(r.locked,2);assert.equal(p.clips[0].transition,'zoom');assert.equal(p.clips[1].transition,'cut');assert.equal(p.clips[2].transition,'cut');
}
{
  const p=base();p.clips[1].transition='fade';p.clips[1].transitionDuration=.4;p.clips[1].transitionDurationAuto=true;p.clips[1].autoTransition=true;const r=Engine.apply(p,{scope:'selected',selectedId:'b',type:'cut'});
  assert.equal(r.changed,1);assert.equal(p.clips[1].transition,'cut');assert.equal('transitionDuration' in p.clips[1],false);assert.equal('transitionDurationAuto' in p.clips[1],false);assert.equal(p.clips[1].autoTransition,false);
}
{
  const p=base(),r=Engine.apply(p,{scope:'all',type:'fade',duration:'9'});
  assert.equal(r.changed,3);assert.equal(p.clips[1].transitionDuration,1);assert.equal(p.clips[0].transitionDuration,2);assert.equal(p.clips[2].transitionDuration,2);
}
{
  const p=base(),before=structuredClone(p);const r=Engine.apply(p,{scope:'all',type:'wipe',duration:'auto'});
  assert.equal(r.reason,'invalid-type');assert.deepEqual(p,before);
}
{
  const p=base(),before=structuredClone(p);const r=Engine.apply(p,{scope:'selected',selectedId:{toString:()=> 'b'},type:'fade',duration:'auto'});
  assert.equal(r.reason,'no-selection');assert.deepEqual(p,before);
}
{
  const p=base();p.clips[1].id=2;let r=Engine.apply(p,{scope:'selected',selectedId:'02.0',type:'fade',duration:'auto'});assert.equal(r.changed,1);assert.equal(p.clips[1].transition,'fade');
  r=Engine.apply(p,{scope:'selected',selectedId:2,type:'zoom',duration:'auto'});assert.equal(r.changed,1);assert.equal(p.clips[1].transition,'zoom');
}
{
  const p=base();p.clips[0].track='00';p.clips[1].track='+0.0';p.clips[2].track='01';const r=Engine.apply(p,{scope:'all',type:'fade',duration:'auto'});assert.equal(r.targets,3);assert.equal(r.changed,3);
}
{
  const p=base();p.clips[1].duration=.08;const r=Engine.apply(p,{scope:'selected',selectedId:'b',type:'fade',duration:'auto'});assert.equal(r.changed,1);assert.equal(p.clips[1].transitionDuration,.08);
}
{
  const p=base();p.trackState['0']={locked:'true'};const r=Engine.apply(p,{scope:'track',selectedId:'b',type:'fade',duration:'auto'});assert.equal(r.locked,0);assert.equal(r.changed,2,'truthy string lock must not block edits');
}
console.log('manual transition engine regression: ok');
