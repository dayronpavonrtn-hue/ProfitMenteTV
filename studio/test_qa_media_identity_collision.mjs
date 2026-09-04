import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require=createRequire(import.meta.url);
const {ProfitMenteQAEngine}=require('./qa-engine.js');
globalThis.ProfitMenteQAEngine=ProfitMenteQAEngine;
const guard=require('./qa-media-identity-guard.js');

assert.equal(guard.mediaIdKey(0),'0');
assert.equal(guard.mediaIdKey(' 7 '),'7');
assert.equal(guard.mediaIdKey('   '),null);

const baseProject={
  duration:10,
  format:'9:16',
  clips:[{id:'clip-1',name:'Video',track:0,start:0,duration:10,asset:7,fitMode:'cover'}]
};
const readableBlob={size:10,arrayBuffer:async()=>new ArrayBuffer(10)};

const qa=new ProfitMenteQAEngine();
const clean=qa.inspect(baseProject,[{id:'7',name:'video.mp4',type:'video',blob:readableBlob,width:1080,height:1920,duration:10}]);
assert.equal(clean.issues.some(x=>x.includes('IDs de medio ambiguos')),false,clean);
assert.equal(clean.metrics.mediaIdentityCollisions,undefined,clean.metrics);

const ambiguousAssets=[
  {id:7,name:'first.mp4',type:'video',blob:readableBlob,width:1080,height:1920,duration:10},
  {id:' 7 ',name:'second.mp4',type:'video',blob:readableBlob,width:1080,height:1920,duration:10}
];
const collisions=guard.findCanonicalMediaCollisions(ambiguousAssets);
assert.deepEqual(collisions,[{key:'7',firstIndex:0,secondIndex:1}]);

const blocked=qa.inspect(baseProject,ambiguousAssets);
assert.equal(blocked.ok,false,blocked);
assert.equal(blocked.metrics.mediaIdentityCollisions,1,blocked.metrics);
assert.equal(blocked.issues.filter(x=>x.includes('IDs de medio ambiguos')).length,1,blocked.issues);
assert.ok(blocked.issues.some(x=>x.includes('first.mp4')&&x.includes('second.mp4')&&x.includes('"7"')),blocked.issues);
assert.ok(blocked.score<=clean.score-25,{clean:clean.score,blocked:blocked.score});

const zeroCollision=qa.inspect({...baseProject,clips:[{...baseProject.clips[0],asset:0}]},[
  {id:0,name:'zero-a.mp4',type:'video',blob:readableBlob,width:1080,height:1920,duration:10},
  {id:'0',name:'zero-b.mp4',type:'video',blob:readableBlob,width:1080,height:1920,duration:10}
]);
assert.equal(zeroCollision.metrics.mediaIdentityCollisions,1,zeroCollision.metrics);
assert.equal(zeroCollision.ok,false,zeroCollision);

console.log('QA media identity collision preflight OK');
