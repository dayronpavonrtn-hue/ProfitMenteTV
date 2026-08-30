import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

vm.runInThisContext(fs.readFileSync(new URL('./range-edit-engine.js',import.meta.url),'utf8'));
let n=0;
const engine=new globalThis.ProfitMenteRangeEditEngine({idFactory:()=>`new-${++n}`});

const base=()=>({
  duration:12,
  trackState:{},
  markers:[{time:1},{time:5},{time:10}],
  workRange:{start:2,end:10},
  clips:[
    {id:'a',track:0,start:0,duration:8,asset:'v.mp4',speed:2,sourceOffset:1,keyframes:{start:{x:0},end:{x:80}},fadeIn:.2,fadeOut:.3},
    {id:'b',track:1,start:8,duration:2,asset:'v2.mp4',sourceOffset:0},
    {id:'c',track:3,start:8,duration:3,name:'hello world',wordTimings:[{word:'hello',start:8,end:9},{word:'world',start:9,end:10}]}
  ]
});

let project=base();
let result=engine.extract(project,3,6);
assert.equal(project.duration,9);
assert.equal(result.split,1);
let left=project.clips.find(x=>x.id==='a');
let right=project.clips.find(x=>x.id!=='a'&&x.asset==='v.mp4');
assert.equal(left.duration,3);
assert.equal(right.start,3);
assert.equal(right.duration,2);
assert.equal(right.sourceOffset,13);
assert.equal(right.keyframes.start.x,60);
assert.equal(right.keyframes.end.x,80);
assert.equal(project.clips.find(x=>x.id==='b').start,5);
assert.equal(project.clips.find(x=>x.id==='c').start,5);
assert.deepEqual(project.markers.map(x=>x.time),[1,7]);
assert.deepEqual(project.workRange,{start:2,end:7});

project=base();
result=engine.insert(project,2,1.5);
assert.equal(project.duration,13.5);
assert.equal(result.split,1);
left=project.clips.find(x=>x.id==='a');
right=project.clips.find(x=>x.asset==='v.mp4'&&x.id!=='a');
assert.equal(left.duration,2);
assert.equal(right.start,3.5);
assert.equal(right.duration,6);
assert.equal(right.sourceOffset,5);
assert.deepEqual(project.markers.map(x=>x.time),[1,6.5,11.5]);
assert.deepEqual(project.workRange,{start:3.5,end:11.5});

project=base();
project.trackState[0]={locked:true};
assert.throws(()=>engine.extract(project,3,6),/Desbloquea/);
assert.equal(project.clips.length,3);

project=base();
project.clips=[{id:'cap',track:3,start:1,duration:5,name:'one two three',wordTimings:[{word:'one',start:1,end:2},{word:'two',start:3,end:4},{word:'three',start:5,end:6}]}];
engine.extract(project,2,5);
const captions=project.clips.filter(x=>x.track===3).sort((a,b)=>a.start-b.start);
assert.equal(captions.length,2);
assert.equal(captions[1].start,2);
assert.equal(captions[1].wordTimings[0].start,2);
assert.equal(captions[1].name,'three');

console.log('range edit regression ok');
