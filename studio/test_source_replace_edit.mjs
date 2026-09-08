import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const Engine=require('./media-replace-engine.js');

const asset=(overrides={})=>({id:'new-media',name:'Take B.mp4',type:'video',duration:20,...overrides});
const clip=(overrides={})=>({id:'clip-1',asset:'old-media',name:'Take A.mp4',track:0,start:4,duration:3,sourceOffset:1,speed:1,transition:'fade',fadeIn:.2,fadeOut:.3,...overrides});
const project=(c=clip(),overrides={})=>({duration:30,clips:[c],trackState:{},...overrides});

{
  const c=clip(),p=project(c),r=Engine.replaceFromRange(p,c.id,asset(),6,12);
  assert.equal(r.ok,true);
  assert.equal(c.asset,'new-media');
  assert.equal(c.sourceOffset,6);
  assert.equal(c.start,4);
  assert.equal(c.duration,3);
  assert.equal(c.track,0);
  assert.equal(c.speed,1);
  assert.equal(c.transition,'fade');
  assert.equal(c.fadeIn,.2);
  assert.equal(c.fadeOut,.3);
  assert.equal(r.sourceOut,9);
  assert.equal(r.preservedDuration,true);
}

{
  const c=clip({duration:3,speed:2}),p=project(c),r=Engine.replaceFromRange(p,c.id,asset(),5,11);
  assert.equal(r.ok,true);
  assert.equal(r.requiredSource,6);
  assert.equal(r.sourceIn,5);
  assert.equal(r.sourceOut,11);
  assert.equal(c.duration,3);
  assert.equal(c.speed,2);
}

{
  const c=clip({duration:3,speed:2}),p=project(c),before=structuredClone(c),r=Engine.replaceFromRange(p,c.id,asset(),5,10.9);
  assert.equal(r.ok,false);
  assert.equal(r.reason,'source-selection-too-short');
  assert.deepEqual(c,before);
}

{
  const c=clip({duration:4}),p=project(c),before=structuredClone(c),r=Engine.replaceFromRange(p,c.id,asset({duration:8}),6,10);
  assert.equal(r.ok,false);
  assert.equal(r.reason,'invalid-source-range');
  assert.deepEqual(c,before);
}

{
  const c=clip({locked:true}),p=project(c),before=structuredClone(c),r=Engine.replaceFromRange(p,c.id,asset(),2,8);
  assert.equal(r.ok,false);
  assert.equal(r.reason,'locked');
  assert.deepEqual(c,before);
}

{
  const c=clip(),p=project(c,{trackState:{0:{locked:true}}}),before=structuredClone(c),r=Engine.replaceFromRange(p,c.id,asset(),2,8);
  assert.equal(r.ok,false);
  assert.equal(r.reason,'locked');
  assert.deepEqual(c,before);
}

{
  const c=clip(),p=project(c),before=structuredClone(c),r=Engine.replaceFromRange(p,c.id,asset({type:'audio'}),2,8);
  assert.equal(r.ok,false);
  assert.equal(r.reason,'incompatible');
  assert.deepEqual(c,before);
}

{
  const first=clip(),second=clip({asset:'other'}),p=project(first);p.clips.push(second);const before=structuredClone(p.clips),r=Engine.replaceFromRange(p,'clip-1',asset(),2,8);
  assert.equal(r.ok,false);
  assert.equal(r.reason,'clip-ambiguous');
  assert.deepEqual(p.clips,before);
}

{
  const c=clip(),p=project(c),before=structuredClone(c),r=Engine.replaceFromRange(p,c.id,asset({duration:0}),2,8);
  assert.equal(r.ok,false);
  assert.equal(r.reason,'unknown-duration');
  assert.deepEqual(c,before);
}

{
  const c=clip({duration:7}),p=project(c),r=Engine.replaceFromRange(p,c.id,asset({id:'still',name:'Still.png',type:'image'}),0,5);
  assert.equal(r.ok,true);
  assert.equal(c.asset,'still');
  assert.equal(c.sourceOffset,0);
  assert.equal(c.duration,7);
  assert.equal(c.start,4);
}

console.log('Source replace edit regression: OK');
