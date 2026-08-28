import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {ProfitMenteSelectionEngine}=require('./selection-engine.js');

if(!globalThis.crypto)globalThis.crypto={randomUUID:()=>`qa-${Math.random().toString(16).slice(2)}`};

const project={duration:12,trackState:{1:{locked:true}},clips:[
  {id:'a',track:0,name:'A',start:1,duration:2},
  {id:'b',track:0,name:'B',start:4,duration:2},
  {id:'c',track:1,name:'Locked',start:7,duration:1}
]};
const s=new ProfitMenteSelectionEngine();
s.set(['a','b','c']);
let r=s.shift(project,.5);assert.equal(r.moved,2);assert.equal(r.blocked,1);assert.equal(project.clips.find(c=>c.id==='a').start,1.5);assert.equal(project.clips.find(c=>c.id==='b').start,4.5);assert.equal(project.clips.find(c=>c.id==='c').start,7);
r=s.shift(project,-99);assert.equal(r.delta,-1.5);assert.equal(project.clips.find(c=>c.id==='a').start,0);assert.equal(project.clips.find(c=>c.id==='b').start,3);
s.set(['a','b','c']);r=s.duplicate(project,.35);assert.equal(r.clips.length,2);assert.equal(r.blocked,1);assert.deepEqual(r.clips.map(c=>c.start),[.35,3.35]);assert.equal(s.count,2);assert.ok(r.clips.every(c=>c.name.endsWith(' copia')));
s.set([r.clips[0].id,r.clips[1].id,'c']);r=s.remove(project);assert.equal(r.removed,2);assert.equal(r.blocked,1);assert.deepEqual(r.remaining,['c']);assert.ok(project.clips.some(c=>c.id==='c'));

const ripple={duration:20,trackState:{},clips:[
  {id:'v1',track:0,start:0,duration:3},
  {id:'v2',track:0,start:3,duration:2},
  {id:'cap',track:3,start:3,duration:2},
  {id:'v3',track:0,start:5,duration:4},
  {id:'music',track:5,start:9,duration:5}
]};
s.set(['v2','cap']);r=s.rippleRemove(ripple);assert.equal(r.reason,'ok');assert.equal(r.removed,2);assert.equal(r.gap,2);assert.equal(r.shifted,2);assert.equal(ripple.clips.find(c=>c.id==='v3').start,3);assert.equal(ripple.clips.find(c=>c.id==='music').start,7);assert.equal(s.count,0);

const overlap={duration:12,trackState:{},clips:[
  {id:'cut',track:0,start:2,duration:2},
  {id:'voice',track:6,start:1,duration:5},
  {id:'later',track:0,start:4,duration:2}
]};
s.set(['cut']);r=s.rippleRemove(overlap);assert.equal(r.reason,'overlap');assert.equal(r.removed,0);assert.deepEqual(overlap.clips.map(c=>c.start),[2,1,4]);

const lockedAfter={duration:12,trackState:{5:{locked:true}},clips:[
  {id:'cut',track:0,start:2,duration:2},
  {id:'lockedMusic',track:5,start:6,duration:2},
  {id:'later',track:0,start:7,duration:2}
]};
s.set(['cut']);r=s.rippleRemove(lockedAfter);assert.equal(r.reason,'locked-after');assert.equal(r.removed,0);assert.equal(lockedAfter.clips.find(c=>c.id==='later').start,7);

console.log('Multi-select + safe ripple delete QA OK');