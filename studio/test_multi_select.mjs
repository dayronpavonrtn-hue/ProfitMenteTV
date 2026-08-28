import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {ProfitMenteSelectionEngine}=require('./selection-engine.js');

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
console.log('Multi-select engine QA OK');