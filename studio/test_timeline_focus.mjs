import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const TimelineFocus=require('./timeline-focus-engine.js');

const project={duration:60,clips:[
  {id:'a',start:2,duration:3,track:0},
  {id:'b',start:12,duration:4,track:1},
  {id:'c',start:45,duration:5,track:0}
]};

assert.equal(TimelineFocus.bounds(project,[]),null);
assert.deepEqual(TimelineFocus.bounds(project,['a']),{start:2,end:5,duration:3,count:1,center:3.5});
assert.deepEqual(TimelineFocus.bounds(project,['a','b']),{start:2,end:16,duration:14,count:2,center:9});
assert.deepEqual(TimelineFocus.bounds(project,['missing','c']),{start:45,end:50,duration:5,count:1,center:47.5});

const tight=TimelineFocus.focus(project,['a']);
assert.equal(tight.ok,true);
assert.equal(tight.zoom,6,'a short selection should clamp to maximum zoom');

const broad=TimelineFocus.focus(project,['a','c']);
assert.equal(broad.ok,true);
assert.equal(broad.bounds.start,2);
assert.equal(broad.bounds.end,50);
assert.equal(broad.zoom,1,'a broad selection should not zoom out below project fit');

const medium=TimelineFocus.focus(project,['b']);
assert.equal(medium.zoom,6);
assert.deepEqual(TimelineFocus.focus(project,['nope']),{ok:false,reason:'empty',zoom:1,bounds:null});

const custom=TimelineFocus.zoomForBounds(project,{duration:20},{coverage:.5,max:4});
assert.equal(custom,1.5);
assert.equal(TimelineFocus.zoomForBounds(project,{duration:0},{minSpan:.25}),6);

console.log('timeline focus regression: ok');
