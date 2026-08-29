import assert from 'node:assert/strict';
import './clip-group-engine.js';
const {ProfitMenteClipGroupEngine}=globalThis;
const engine=new ProfitMenteClipGroupEngine();
const project={clips:[
  {id:'v1',track:0,start:0,duration:3},
  {id:'a1',track:1,start:0,duration:3},
  {id:'t1',track:2,start:1,duration:1},
  {id:'v2',track:0,start:4,duration:2}
]};
let r=engine.group(project,['v1','a1','t1']);
assert.equal(r.reason,'ok');assert.equal(r.changed,3);assert.ok(r.groupId);assert.equal(engine.members(project,r.groupId).length,3);
assert.deepEqual(new Set(engine.expand(project,['a1'])),new Set(['v1','a1','t1']));
assert.equal(engine.validate(project).ok,true);
const serialized=JSON.parse(JSON.stringify(project));
assert.equal(engine.members(serialized,r.groupId).length,3,'groupId must survive project serialization');
const duplicateGroupId=r.groupId;
project.clips.push(
  {...structuredClone(project.clips[0]),id:'v1-copy'},
  {...structuredClone(project.clips[1]),id:'a1-copy'}
);
let isolated=engine.isolate(project,['v1-copy','a1-copy']);
assert.equal(isolated.regrouped,1);assert.equal(isolated.changed,2);
const copyGroup=engine.groupId(project.clips.find(c=>c.id==='v1-copy'));
assert.ok(copyGroup&&copyGroup!==duplicateGroupId,'duplicated group must receive a new groupId');
assert.equal(engine.groupId(project.clips.find(c=>c.id==='a1-copy')),copyGroup);
project.clips.push({...structuredClone(project.clips.find(c=>c.id==='t1')),id:'t1-copy'});
isolated=engine.isolate(project,['t1-copy']);
assert.equal(isolated.ungrouped,1);assert.equal(engine.groupId(project.clips.find(c=>c.id==='t1-copy')),'','single duplicated member must not stay linked to originals');
let u=engine.ungroup(project,['v1']);
assert.equal(u.groups,1);assert.equal(u.changed,3);assert.equal(engine.groupId(project.clips.find(c=>c.id==='v1')),'');
assert.equal(engine.group(project,['v2']).reason,'not-enough');
project.clips.find(c=>c.id==='v2').groupId='orphan-group';
assert.equal(engine.validate(project).ok,false);const repaired=engine.repair(project);assert.equal(repaired.repaired,1);assert.equal(project.clips.find(c=>c.id==='v2').groupId,undefined);
console.log('clip group regression: ok');