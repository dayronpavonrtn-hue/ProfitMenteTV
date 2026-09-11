import assert from 'node:assert/strict';
import mod from './transition-preview-engine.js';
const {ProfitMenteTransitionPreviewEngine:E}=mod;

const project={clips:[
  {id:'a',track:0,start:0,duration:4,transition:'cut'},
  {id:'b',track:0,start:4,duration:4,transition:'fade',transitionDuration:.5},
  {id:'c',track:0,start:8,duration:4,transition:'slide',transitionDuration:'0.4'},
  {id:'d',track:1,start:12,duration:4,transition:'zoom',transitionDuration:.5}
]};
assert.equal(E.state(project,3.99),null,'cut must not animate');
let s=E.state(project,4);assert.equal(s.type,'fade');assert.equal(s.progress,0);
s=E.state(project,4.25);assert.equal(s.progress,.5);assert.equal(E.transform(s,100,100).alpha,.5);
assert.equal(E.state(project,4.5),null,'transition must end at its configured duration');
s=E.state(project,8.2);assert.equal(s.type,'slide');assert.ok(Math.abs(E.transform(s,100,100).x-50)<1e-8);
s=E.state(project,12.25);assert.equal(s.type,'zoom');const z=E.transform(s,100,200);assert.ok(z.scale>.88&&z.scale<1);assert.ok(z.alpha>.4&&z.alpha<1);

for(const bad of [true,[],{},'',NaN,Infinity]){
  const p={clips:[{track:0,start:bad,duration:4,transition:'fade',transitionDuration:.5}]};
  assert.equal(E.state(p,0),null,'invalid scalar start must be rejected');
}
assert.equal(E.state({clips:[{track:0,start:0,duration:4,transition:'fade',transitionDuration:true}]},0),null,'boolean transition duration must be rejected');
assert.equal(E.state({clips:[{track:'0',start:'2',duration:'4',transition:'fade',transitionDuration:'0.5'}]},'2.25').progress,.5,'numeric legacy strings remain supported');
console.log('transition preview regression: ok');