import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const E=require('./edit-navigation-engine.js');

const project={
  duration:'20.0',
  clips:[
    {id:'a',track:0,start:0,duration:5},
    {id:'b',track:'0',start:'5.0',duration:'4'},
    {id:'c',track:1,start:2,duration:3},
    {id:'bad-array',track:[0],start:10,duration:2},
    {id:'bad-start',track:0,start:[12],duration:2},
    {id:'bad-duration',track:0,start:12,duration:{valueOf(){return 2}}}
  ],
  markers:[{time:7},{time:[8]},{time:'13.5'}],
  workRange:{start:'1.5',end:'18'}
};

assert.deepEqual(E.collect(project),[0,1.5,2,5,9,18,20]);
assert.deepEqual(E.collect(project,{track:0}),[0,1.5,5,9,18,20]);
assert.deepEqual(E.collect(project,{track:'01'}),[0,1.5,2,5,18,20]);
assert.deepEqual(E.collect(project,{includeMarkers:true}),[0,1.5,2,5,7,9,13.5,18,20]);
assert.deepEqual(E.collect(project,{track:[0]}),[]);
assert.equal(E.seek(project,5,'next').time,9);
assert.equal(E.seek(project,5,'previous').time,2);
assert.equal(E.seek(project,'5.0001','previous').time,2,'epsilon avoids bouncing on same cut');
assert.equal(E.seek(project,19,'next').time,20);
assert.equal(E.seek(project,20,'next').edge,true);
assert.equal(E.seek(project,0,'previous').time,0);
assert.equal(E.seek(project,[5],'next').ok,false);
assert.equal(E.seek(project,5,'sideways').ok,false);
assert.equal(E.duration({duration:new Number(20)}),0);
assert.equal(E.trackKey(false),null);
assert.equal(E.trackKey('04.0'),4);
assert.equal(E.trackKey('-0'),0);
assert.equal(E.clipWindow({start:true,duration:2},20),null);
assert.equal(E.clipWindow({start:1,duration:[2]},20),null);

console.log('Edit navigation QA passed');
