import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);const {ProfitMenteSelectionEngine}=require('./selection-engine.js');
const engine=new ProfitMenteSelectionEngine();

const project={duration:20,clips:[
  {id:'a',track:0,start:1,duration:2},
  {id:'b',track:0,start:5,duration:1},
  {id:'c',track:0,start:9,duration:2}
]};
engine.set(['a','b','c']);
let r=engine.align(project,'start');assert.equal(r.reason,'ok');assert.deepEqual(project.clips.map(c=>c.start),[1,1,1]);
project.clips[0].start=1;project.clips[1].start=5;project.clips[2].start=9;
r=engine.align(project,'end');assert.equal(r.reason,'ok');assert.deepEqual(project.clips.map(c=>c.start),[9,10,9]);
project.clips[0].start=1;project.clips[1].start=5;project.clips[2].start=9;
r=engine.distribute(project);assert.equal(r.reason,'ok');assert.equal(r.gap,3);assert.deepEqual(project.clips.map(c=>c.start),[1,6,10]);
project.clips[0].start=1;project.clips[1].start=5;project.clips[2].start=9;
r=engine.compact(project);assert.equal(r.reason,'ok');assert.deepEqual(project.clips.map(c=>c.start),[1,3,4]);

const mixed={duration:20,clips:[{id:'a',track:0,start:1,duration:2},{id:'b',track:1,start:5,duration:2},{id:'c',track:0,start:9,duration:2}]};engine.set(['a','b','c']);assert.equal(engine.distribute(mixed).reason,'mixed-tracks');assert.equal(engine.compact(mixed).reason,'mixed-tracks');
const locked={duration:20,trackState:{0:{locked:true}},clips:[{id:'a',track:0,start:1,duration:2},{id:'b',track:0,start:5,duration:2}]};engine.set(['a','b']);r=engine.align(locked,'start');assert.equal(r.reason,'locked-selection');assert.deepEqual(locked.clips.map(c=>c.start),[1,5]);
const move={duration:10,clips:[{id:'a',track:0,start:2,duration:2},{id:'b',track:1,start:5,duration:2}]};engine.set(['a','b']);r=engine.moveTo(move,9);assert.equal(r.reason,'ok');assert.equal(r.delta,3);assert.deepEqual(move.clips.map(c=>c.start),[5,8]);
console.log('selection arrange engine ok');
