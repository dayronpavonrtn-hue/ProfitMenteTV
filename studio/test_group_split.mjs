import assert from 'node:assert/strict';
import Split from './split-edit-engine.js';
import GroupSplit from './group-split-engine.js';

const engine=new GroupSplit(Split);
const project={duration:20,trackState:{},clips:[
  {id:'v',groupId:'g1',track:0,name:'Video',start:2,duration:8,sourceOffset:1,speed:1.5,asset:'video'},
  {id:'a',groupId:'g1',track:6,name:'Voice',start:2,duration:8,sourceOffset:4,speed:1,asset:'audio'},
  {id:'later',track:0,name:'Later',start:12,duration:2,asset:'x'}
]};
let id=0,gid=0;
const result=engine.split(project,project.clips[0],6,{idFactory:()=>`new-${++id}`,groupIdFactory:side=>`${side}-${++gid}`});
assert.equal(result.ok,true);
assert.equal(result.count,2);
assert.equal(project.clips.length,5);
const leftV=project.clips.find(c=>c.id==='v'),rightV=project.clips.find(c=>c.id===result.rightId);
const leftA=project.clips.find(c=>c.id==='a'),rightA=project.clips.find(c=>c.id==='new-2');
assert.equal(leftV.duration,4);assert.equal(rightV.start,6);assert.equal(rightV.duration,4);assert.equal(rightV.sourceOffset,7);
assert.equal(leftA.duration,4);assert.equal(rightA.start,6);assert.equal(rightA.sourceOffset,8);
assert.equal(leftV.groupId,leftA.groupId);assert.equal(rightV.groupId,rightA.groupId);assert.notEqual(leftV.groupId,rightV.groupId);
assert.equal(project.clips.find(c=>c.id==='later').start,12);

const locked={trackState:{6:{locked:true}},clips:[{id:'v',groupId:'g',track:0,start:0,duration:4},{id:'a',groupId:'g',track:6,start:0,duration:4}]};
const before=JSON.stringify(locked);const blocked=engine.split(locked,locked.clips[0],2);
assert.equal(blocked.ok,false);assert.equal(blocked.reason,'locked');assert.equal(JSON.stringify(locked),before);

const uneven={trackState:{},clips:[{id:'v',groupId:'g',track:0,start:0,duration:6},{id:'a',groupId:'g',track:6,start:0,duration:2}]};
const unevenBefore=JSON.stringify(uneven);const invalid=engine.split(uneven,uneven.clips[0],3);
assert.equal(invalid.ok,false);assert.equal(invalid.reason,'member-outside');assert.equal(JSON.stringify(uneven),unevenBefore);

const solo={trackState:{},clips:[{id:'s',track:0,start:1,duration:4,sourceOffset:2,speed:2}]};
const single=engine.split(solo,solo.clips[0],3,{idFactory:()=> 's2'});
assert.equal(single.ok,true);assert.equal(single.count,1);assert.equal(solo.clips[0].groupId,undefined);assert.equal(solo.clips[1].sourceOffset,6);
console.log('Group split regression OK');
