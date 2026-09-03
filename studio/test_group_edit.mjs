import assert from 'node:assert/strict';
import engineModule from './group-edit-engine.js';
const {ProfitMenteGroupEditEngine}=engineModule;
const engine=new ProfitMenteGroupEditEngine();
let seq=0;const idFactory=()=>`new-${++seq}`;

const project={duration:12,trackState:{0:{locked:false},5:{locked:false}},clips:[
  {id:'v1',groupId:'g1',track:0,name:'Video',start:2,duration:4,asset:'video'},
  {id:'a1',groupId:'g1',track:5,name:'Audio',start:2.25,duration:3.5,asset:'audio',volume:.8},
  {id:'solo',track:0,name:'Solo',start:8,duration:2}
]};
const anchor=project.clips[0];
assert.equal(engine.members(project,anchor).length,2);
assert.equal(engine.lockedMembers(project,anchor).length,0);
const dup=engine.duplicate(project,anchor,{idFactory,offset:.5});
assert.equal(dup.copies.length,2);
assert.equal(dup.delta,.5);
assert.equal(dup.copies[0].start,2.5);
assert.equal(dup.copies[1].start,2.75);
assert.equal(dup.copies[1].volume,.8);
assert.ok(dup.copies[0].groupId);
assert.equal(dup.copies[0].groupId,dup.copies[1].groupId);
assert.notEqual(dup.copies[0].groupId,'g1');
assert.equal(project.clips.length,5);

const removed=engine.remove(project,anchor);
assert.equal(removed.length,2);
assert.equal(project.clips.some(c=>c.groupId==='g1'),false);
assert.equal(project.clips.length,3);
assert.equal(project.duration,12,'an intentional tail beyond content must survive a normal grouped delete');

const solo=project.clips.find(c=>c.id==='solo');
const soloDup=engine.duplicate(project,solo,{idFactory,offset:.5});
assert.equal(soloDup.copies.length,1);
assert.equal(soloDup.copies[0].start,8.5);
assert.equal(soloDup.copies[0].groupId,undefined);

const edge={duration:5,clips:[{id:'e',track:0,name:'Edge',start:4,duration:1}]};
const edgeDup=engine.duplicate(edge,edge.clips[0],{idFactory,offset:.5});
assert.equal(edgeDup.copies[0].start,3.5,'when there is no room on the right, duplicate should move left');

const lockedProject={duration:5,trackState:{0:{locked:false},5:{locked:true}},clips:[
  {id:'lv',groupId:'lg',track:0,start:0,duration:2},
  {id:'la',groupId:'lg',track:5,start:0,duration:2}
]};
assert.equal(engine.lockedMembers(lockedProject,lockedProject.clips[0]).length,1);

const legacyLocked={duration:5,trackState:{0:{locked:false},5:{locked:false}},trackStates:{5:{locked:true}},clips:[
  {id:'legacy-v',groupId:'legacy-g',track:0,start:0,duration:2},
  {id:'legacy-a',groupId:'legacy-g',track:5,start:0,duration:2}
]};
const legacyBefore=JSON.stringify(legacyLocked);
assert.equal(engine.lockedMembers(legacyLocked,legacyLocked.clips[0]).length,1,'legacy lock must win over modern unlocked state');
const legacyDup=engine.duplicate(legacyLocked,legacyLocked.clips[0],{idFactory,offset:.5});
assert.equal(legacyDup.reason,'locked');
assert.equal(legacyDup.copies.length,0);
assert.deepEqual(engine.remove(legacyLocked,legacyLocked.clips[0]),[]);
assert.equal(JSON.stringify(legacyLocked),legacyBefore,'blocked grouped edits must not mutate legacy-locked projects');

const contentBound={duration:12,clips:[
  {id:'keep',track:0,start:0,duration:5},
  {id:'tail-v',groupId:'tail',track:0,start:5,duration:7},
  {id:'tail-a',groupId:'tail',track:5,start:5.5,duration:6.5}
]};
const tailRemoved=engine.remove(contentBound,contentBound.clips[1]);
assert.equal(tailRemoved.length,2);
assert.equal(contentBound.clips.length,1);
assert.equal(contentBound.duration,5,'normal grouped delete must shrink content-bound duration and prevent a stale blank render tail');

const explicitTail={duration:20,clips:[
  {id:'keep-tail',track:0,start:0,duration:5},
  {id:'remove-tail',track:0,start:5,duration:7}
]};
engine.remove(explicitTail,explicitTail.clips[1]);
assert.equal(explicitTail.duration,20,'normal delete must preserve an explicit project tail beyond prior content');

const middleDelete={duration:12,clips:[
  {id:'first',track:0,start:0,duration:4},
  {id:'middle',track:0,start:4,duration:3},
  {id:'last',track:0,start:7,duration:5}
]};
engine.remove(middleDelete,middleDelete.clips[1]);
assert.equal(middleDelete.duration,12,'deleting a middle clip must not shorten duration while later content still reaches the project end');

const lastClip={duration:4,clips:[{id:'only',track:0,start:0,duration:4}]};
engine.remove(lastClip,lastClip.clips[0]);
assert.equal(lastClip.duration,0,'deleting the final content-bound clip must clear stale duration');

console.log('ProfitMente grouped edit QA passed');