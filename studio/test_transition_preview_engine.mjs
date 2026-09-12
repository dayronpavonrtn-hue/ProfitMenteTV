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
s=E.state(project,8.2);assert.equal(s.type,'slide');
let slide=E.transform(s,100,100);assert.ok(Math.abs(slide.x-50)<1e-8);assert.ok(Math.abs(slide.alpha-.5)<1e-8,'slide alpha must match MP4 fade-in');
s=E.state(project,12.25);assert.equal(s.type,'zoom');const z=E.transform(s,100,200);
assert.ok(Math.abs(z.scale-1.0125)<1e-10,'zoom scale must match MP4 1.025 -> 1.0 settle');
assert.ok(Math.abs(z.alpha-.5)<1e-10,'zoom alpha must match MP4 fade-in');
assert.ok(z.x<0&&z.y<0,'enlarged zoom must remain centered while cropped');

// render_mp4.py derives a transition duration when older/automatic projects do not
// persist transitionDuration. Preview must use the exact same fallback formula.
const defaultDuration={clips:[{id:'default-duration',track:0,start:20,duration:4,transition:'fade'}]};
s=E.state(defaultDuration,20.14);
assert.equal(s.type,'fade');
assert.ok(Math.abs(s.duration-.28)<1e-12,'4s clip must use MP4 fallback min(.28,max(.08,d*.12))');
assert.ok(Math.abs(s.progress-.5)<1e-10,'default transition progress must match MP4');
assert.equal(E.state(defaultDuration,20.28),null,'default transition must end at the MP4 fallback duration');
const shortDefault={clips:[{id:'short-default',track:0,start:2,duration:.5,transition:'slide'}]};
s=E.state(shortDefault,2.04);
assert.ok(Math.abs(s.duration-.08)<1e-12,'short clips must use the MP4 minimum fallback duration');
assert.ok(Math.abs(s.progress-.5)<1e-10);
const invalidDuration={clips:[{id:'invalid-duration',track:0,start:3,duration:4,transition:'zoom',transitionDuration:'not-a-number'}]};
s=E.state(invalidDuration,3.14);
assert.ok(Math.abs(s.duration-.28)<1e-12,'invalid explicit duration must fall back like render_mp4.py');

// render_mp4.py intentionally skips visual transitions for clips that begin at t=0.
// Preview must do the same or the first frame shown while editing will not match MP4.
for(const type of ['fade','slide','zoom']){
  const firstClip={clips:[{id:`first-${type}`,track:0,start:0,duration:4,transition:type,transitionDuration:1}]};
  assert.equal(E.state(firstClip,0),null,`${type} must not animate the first clip at timeline zero`);
  assert.equal(E.state(firstClip,.5),null,`${type} first-clip preview must match MP4 semantics`);
}

// The MP4 compositor stacks visual clips by track and then by start time. Preview
// must choose the same top-most entering transition even when project JSON order is
// different, otherwise scrubbing can animate a clip hidden underneath another one.
const overlap={clips:[
  {id:'later-start-first-in-json',track:0,start:5,duration:4,transition:'slide',transitionDuration:2},
  {id:'earlier-start-later-in-json',track:0,start:4,duration:4,transition:'fade',transitionDuration:2}
]};
s=E.state(overlap,5.25);
assert.equal(s.clipId,'later-start-first-in-json','later start on the same track must win regardless of JSON order');
assert.equal(s.type,'slide');

const equalStart={clips:[
  {id:'first',track:0,start:5,duration:4,transition:'fade',transitionDuration:1},
  {id:'second',track:0,start:5,duration:4,transition:'zoom',transitionDuration:1}
]};
assert.equal(E.state(equalStart,5.2).clipId,'second','equal track/start preserves stable compositor order');

const higherTrack={clips:[
  {id:'video',track:0,start:5,duration:4,transition:'slide',transitionDuration:1},
  {id:'overlay',track:1,start:4.8,duration:4,transition:'fade',transitionDuration:1}
]};
assert.equal(E.state(higherTrack,5.2).clipId,'overlay','higher visual track must win over start ordering');

for(const bad of [true,[],{},'',NaN,Infinity]){
  const p={clips:[{track:0,start:bad,duration:4,transition:'fade',transitionDuration:.5}]};
  assert.equal(E.state(p,0),null,'invalid scalar start must be rejected');
}
assert.equal(E.state({clips:[{track:0,start:0,duration:4,transition:'fade',transitionDuration:true}]},0),null,'boolean transition duration must not animate a clip at timeline zero');
assert.equal(E.state({clips:[{track:'0',start:'2',duration:'4',transition:'fade',transitionDuration:'0.5'}]},'2.25').progress,.5,'numeric legacy strings remain supported');
console.log('transition preview regression: ok');