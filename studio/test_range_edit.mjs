import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

vm.runInThisContext(fs.readFileSync(new URL('./range-edit-engine.js',import.meta.url),'utf8'));
let n=0,g=0;
const engine=new globalThis.ProfitMenteRangeEditEngine({idFactory:()=>`new-${++n}`,groupIdFactory:()=>`group-new-${++g}`});

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

// Range edits must honor legacy track aliases and both track-state maps.
project=base();
project.clips[0].track='0.0';
project.trackStates={'00':{locked:true}};
assert.throws(()=>engine.extract(project,3,6),/Desbloquea/);
assert.equal(project.duration,12);
assert.equal(project.clips.length,3);

project=base();
project.clips[0].track='01';
project.trackState={'1.0':{locked:true}};
assert.throws(()=>engine.insert(project,2,1),/Desbloquea/);
assert.equal(project.duration,12);

// Individual clip locks are destructive-edit blockers too.
project=base();
project.clips[1].locked=true;
assert.throws(()=>engine.extract(project,3,6),/Desbloquea/);
assert.equal(project.clips.find(x=>x.id==='b').start,8);

// Invalid aliases must not accidentally lock a valid track.
project=base();
project.trackStates={'0.5':{locked:true},'7':{locked:true},'':{locked:true}};
result=engine.extract(project,3,6);
assert.equal(result.split,1);
assert.equal(project.duration,9);

// Asset id 0 is a valid media reference and must retain source-window math.
project={duration:8,trackState:{},markers:[],workRange:null,clips:[
  {id:'zero',track:0,start:0,duration:8,asset:0,speed:2,sourceOffset:1}
]};
result=engine.extract(project,3,6);
assert.equal(result.split,1);
left=project.clips.find(x=>x.id==='zero');
right=project.clips.find(x=>x.id!=='zero'&&x.asset===0);
assert.equal(left.sourceOffset,1);
assert.equal(right.start,3);
assert.equal(right.duration,2);
assert.equal(right.sourceOffset,13);

project=base();
project.clips=[{id:'cap',track:3,start:1,duration:5,name:'one two three',wordTimings:[{word:'one',start:1,end:2},{word:'two',start:3,end:4},{word:'three',start:5,end:6}]}];
engine.extract(project,2,5);
const captions=project.clips.filter(x=>x.track===3).sort((a,b)=>a.start-b.start);
assert.equal(captions.length,2);
assert.equal(captions[1].start,2);
assert.equal(captions[1].wordTimings[0].start,2);
assert.equal(captions[1].name,'three');

const grouped=()=>({
  duration:10,trackState:{},markers:[],workRange:null,
  clips:[
    {id:'gv',groupId:'linked-1',track:0,start:0,duration:8,asset:'video.mp4',sourceOffset:0},
    {id:'ga',groupId:'linked-1',track:2,start:0,duration:8,asset:'audio.wav',sourceOffset:0}
  ]
});

project=grouped();
engine.extract(project,3,5);
const extractLeft=project.clips.filter(x=>x.start===0).sort((a,b)=>a.track-b.track);
const extractRight=project.clips.filter(x=>x.start===3).sort((a,b)=>a.track-b.track);
assert.equal(extractLeft.length,2);
assert.equal(extractRight.length,2);
assert.equal(extractLeft[0].groupId,'linked-1');
assert.equal(extractLeft[1].groupId,'linked-1');
assert.equal(extractRight[0].groupId,extractRight[1].groupId);
assert.notEqual(extractRight[0].groupId,'linked-1');

project=grouped();
engine.insert(project,3,2);
const insertLeft=project.clips.filter(x=>x.start===0).sort((a,b)=>a.track-b.track);
const insertRight=project.clips.filter(x=>x.start===5).sort((a,b)=>a.track-b.track);
assert.equal(insertLeft.length,2);
assert.equal(insertRight.length,2);
assert.equal(insertLeft[0].groupId,'linked-1');
assert.equal(insertLeft[1].groupId,'linked-1');
assert.equal(insertRight[0].groupId,insertRight[1].groupId);
assert.notEqual(insertRight[0].groupId,'linked-1');

project={duration:10,trackState:{},clips:[
  {id:'only-left',groupId:'broken',track:0,start:0,duration:2,asset:'a.mp4'},
  {id:'removed',groupId:'broken',track:2,start:3,duration:2,asset:'a.wav'}
]};
engine.extract(project,2.5,5.5);
assert.equal(project.clips.length,1);
assert.equal(project.clips[0].groupId,undefined);

console.log('range edit regression ok');
