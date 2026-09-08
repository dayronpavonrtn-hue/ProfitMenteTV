import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

vm.runInThisContext(fs.readFileSync(new URL('./range-edit-engine.js',import.meta.url),'utf8'));
let n=0,g=0;
const engine=new globalThis.ProfitMenteRangeEditEngine({idFactory:()=>`lift-${++n}`,groupIdFactory:()=>`lift-group-${++g}`});

const base=()=>({
  duration:12,
  trackState:{},
  markers:[{time:1},{time:5},{time:10}],
  workRange:{start:2,end:10},
  clips:[
    {id:'a',track:0,start:0,duration:8,asset:'v.mp4',speed:2,sourceOffset:1,keyframes:{start:{x:0},end:{x:80}},fadeIn:.2,fadeOut:.3},
    {id:'b',track:1,start:8,duration:2,asset:'v2.mp4',sourceOffset:0},
    {id:'c',track:3,start:2,duration:6,name:'one two three',wordTimings:[
      {word:'one',start:2,end:3,index:0},{word:'two',start:4,end:5,index:1},{word:'three',start:7,end:8,index:2}
    ]}
  ]
});

let project=base();
let result=engine.lift(project,3,6);
assert.equal(project.duration,12,'lift must preserve project duration');
assert.deepEqual(project.markers.map(x=>x.time),[1,5,10],'lift must preserve marker time');
assert.deepEqual(project.workRange,{start:2,end:10},'lift must preserve work range');
assert.equal(result.duration,3);
assert.equal(result.split,2);

let left=project.clips.find(x=>x.id==='a');
let right=project.clips.find(x=>x.asset==='v.mp4'&&x.id!=='a');
assert.equal(left.start,0);
assert.equal(left.duration,3);
assert.equal(right.start,6,'right side must stay at original timeline position');
assert.equal(right.duration,2);
assert.equal(right.sourceOffset,13,'source window must advance through removed source');
assert.equal(right.keyframes.start.x,60);
assert.equal(right.keyframes.end.x,80);
assert.equal(project.clips.find(x=>x.id==='b').start,8,'clips after lift must not ripple');

const captions=project.clips.filter(x=>Number(x.track)===3).sort((a,b)=>a.start-b.start);
assert.equal(captions.length,2);
assert.equal(captions[0].name,'one');
assert.equal(captions[0].wordTimings[0].start,2);
assert.equal(captions[1].name,'three');
assert.equal(captions[1].start,6);
assert.equal(captions[1].wordTimings[0].start,7,'caption words keep absolute timeline timing on non-ripple lift');

project=base();
project.clips.push({id:'inside',track:2,start:3.5,duration:1,asset:'sfx.wav'});
result=engine.lift(project,3,6);
assert.equal(result.removed,1);
assert.equal(project.clips.some(x=>x.id==='inside'),false);

project=base();
project.trackState[0]={locked:true};
assert.throws(()=>engine.lift(project,3,6),/Desbloquea/);
assert.equal(project.duration,12);
assert.equal(project.clips.length,3);

project=base();
project.trackStates={'00':{locked:true}};
project.clips[0].track='0.0';
assert.throws(()=>engine.lift(project,3,6),/Desbloquea/,'legacy track aliases must honor locks');

project=base();
project.clips[0].locked=true;
assert.throws(()=>engine.lift(project,3,6),/Desbloquea/,'clip locks must block destructive lift');

project=base();
project.clips.push({id:'later-locked',track:6,start:9,duration:1,locked:true,asset:'voice.wav'});
result=engine.lift(project,3,6);
assert.equal(project.clips.find(x=>x.id==='later-locked').start,9,'unaffected later locked clips must not block lift');

project={duration:10,trackState:{},markers:[],workRange:null,clips:[
  {id:'gv',groupId:'linked',track:0,start:0,duration:8,asset:'video.mp4',sourceOffset:0},
  {id:'ga',groupId:'linked',track:2,start:0,duration:8,asset:'audio.wav',sourceOffset:0}
]};
result=engine.lift(project,3,5);
const groupLeft=project.clips.filter(x=>x.start===0).sort((a,b)=>a.track-b.track);
const groupRight=project.clips.filter(x=>x.start===5).sort((a,b)=>a.track-b.track);
assert.equal(groupLeft.length,2);
assert.equal(groupRight.length,2);
assert.equal(groupLeft[0].groupId,'linked');
assert.equal(groupLeft[1].groupId,'linked');
assert.equal(groupRight[0].groupId,groupRight[1].groupId);
assert.notEqual(groupRight[0].groupId,'linked','split linked media needs a distinct right-side group');

project=base();
assert.throws(()=>engine.lift(project,4,4.01),/0.05s/);
assert.equal(project.clips.length,3);

console.log('range lift regression ok');
