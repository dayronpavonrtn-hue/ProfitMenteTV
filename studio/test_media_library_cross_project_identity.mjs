import assert from 'node:assert/strict';
import Guard from './media-library-cross-project-guard.js';

assert.equal(Guard.mediaIdKey(7),'7');
assert.equal(Guard.mediaIdKey('007'),'7');
assert.equal(Guard.mediaIdKey('+07.0'),'7');
assert.equal(Guard.mediaIdKey(-0),'0');
assert.equal(Guard.mediaIdKey('-0'),'0');
assert.equal(Guard.mediaIdKey('hero-a'),'hero-a');
assert.equal(Guard.mediaIdKey(true),null);
assert.equal(Guard.mediaIdKey(false),null);
assert.equal(Guard.mediaIdKey({id:7}),null);
assert.equal(Guard.mediaIdKey([7]),null);
assert.equal(Guard.mediaIdKey(7.5),null);
assert.equal(Guard.mediaIdKey('7.5'),null);
assert.equal(Guard.mediaIdKey(-1),null);
assert.equal(Guard.mediaIdKey(Number.MAX_SAFE_INTEGER+1),null);
assert.equal(Guard.mediaIdKey(String(Number.MAX_SAFE_INTEGER+1)),null);

assert.equal(Guard.libraryIdKey(' project-a '),'project-a');
assert.equal(Guard.libraryIdKey(7),'7');
assert.equal(Guard.libraryIdKey(true),null);
assert.equal(Guard.libraryIdKey({id:'project-a'}),null);
assert.equal(Guard.sameProject({libraryId:'7'},{libraryId:7}),true);
assert.equal(Guard.sameProject({libraryId:true},{libraryId:'true'}),false);

const projectA={libraryId:'a',clips:[{id:'c1',asset:'007'}]};
const projectB={libraryId:'b',clips:[{id:'c2',asset:'hero-a'},{id:'c3',asset:{id:9}}]};
const assets=[{id:7},{id:'hero-a'},{id:'9'},{id:{id:9}},{id:true}];

assert.deepEqual(Guard.clipsUsing(projectA,7).map(c=>c.id),['c1']);
assert.deepEqual(Guard.clipsUsing(projectB,{id:9}),[],'invalid object media ids must not resolve across projects');
assert.deepEqual([...Guard.usedIdsAcross([projectA,projectB])].sort(),['7','hero-a']);
assert.deepEqual(Guard.unusedAcross([projectA,projectB],assets).map(a=>a.id),['9'],'only valid unused media ids should be eligible for cleanup');

const storage={getItem(){return JSON.stringify([{project:projectB}])}};
const tools={
  usage(project,id){return Guard.clipsUsing(project,id)},
  assetBytes(){return 1}
};
Guard.install(tools,{storage});
const usage=tools.crossProjectUsage(projectA,'hero-a');
assert.equal(usage.available,true);
assert.equal(usage.otherProjects.length,1);
assert.equal(usage.otherClips.length,1);
assert.deepEqual(tools.unused(projectA,assets).map(a=>a.id),['9']);
assert.equal(tools.unusedBytes(projectA,assets),1);

console.log('media library cross-project identity regression passed');
