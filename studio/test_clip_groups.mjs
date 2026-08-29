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
let u=engine.ungroup(project,['v1']);
assert.equal(u.groups,1);assert.equal(u.changed,3);assert.equal(project.clips.some(c=>c.groupId),false);
assert.equal(engine.group(project,['v2']).reason,'not-enough');
project.clips[3].groupId='orphan-group';
assert.equal(engine.validate(project).ok,false);const repaired=engine.repair(project);assert.equal(repaired.repaired,1);assert.equal(project.clips[3].groupId,undefined);
console.log('clip group regression: ok');