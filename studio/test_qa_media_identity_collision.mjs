import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require=createRequire(import.meta.url);
const {ProfitMenteQAEngine}=require('./qa-engine.js');
globalThis.ProfitMenteQAEngine=ProfitMenteQAEngine;
const guard=require('./qa-media-identity-guard.js');

assert.equal(guard.mediaIdKey(0),'n:0');
assert.equal(guard.mediaIdKey('0'),'n:0');
assert.equal(guard.mediaIdKey(' 7 '),'n:7');
assert.equal(guard.mediaIdKey('007.0'),'n:7');
assert.equal(guard.mediaIdKey('asset-7'),'s:asset-7');
assert.equal(guard.mediaIdKey('   '),null);
assert.equal(guard.finiteNumber('10.5'),10.5);
assert.equal(guard.finiteNumber('bad'),'bad');

const baseProject={
  duration:10,
  format:'9:16',
  clips:[{id:'clip-1',name:'Video',track:0,start:0,duration:10,asset:7,fitMode:'cover'}]
};
const readableBlob={size:10,arrayBuffer:async()=>new ArrayBuffer(10)};
const cleanAsset={id:'7',name:'video.mp4',type:'video',blob:readableBlob,width:1080,height:1920,duration:10};

const qa=new ProfitMenteQAEngine();
const clean=qa.inspect(baseProject,[cleanAsset]);
assert.equal(clean.issues.some(x=>x.includes('IDs de medio ambiguos')),false,clean);
assert.equal(clean.metrics.mediaIdentityCollisions,undefined,clean.metrics);

const legacyNumericStrings={...baseProject,duration:'10',clips:[{...baseProject.clips[0],start:'0',duration:'10',sourceOffset:'0',speed:'1'}]};
const normalized=guard.normalizeTimingProject(legacyNumericStrings);
assert.equal(normalized.duration,10);
assert.equal(normalized.clips[0].start,0);
assert.equal(normalized.clips[0].duration,10);
assert.equal(normalized.clips[0].sourceOffset,0);
assert.equal(normalized.clips[0].speed,1);
const legacyQa=qa.inspect(legacyNumericStrings,[cleanAsset]);
assert.equal(legacyQa.ok,true,legacyQa);
assert.equal(legacyQa.metrics.visualCoverage,100,legacyQa.metrics);
assert.equal(legacyQa.issues.some(x=>/fuera de rango/.test(x)),false,legacyQa.issues);

const malformedQa=qa.inspect({...baseProject,clips:[{...baseProject.clips[0],start:'oops',duration:'10',sourceOffset:'bad',speed:'fast'}]},[cleanAsset]);
assert.equal(malformedQa.ok,false,malformedQa);
assert.equal(malformedQa.metrics.invalidTimingFields,3,malformedQa.metrics);
assert.ok(malformedQa.issues.some(x=>/Inicio de clip inválido/.test(x)),malformedQa.issues);
assert.ok(malformedQa.issues.some(x=>/Punto de entrada inválido/.test(x)),malformedQa.issues);
assert.ok(malformedQa.issues.some(x=>/Velocidad de clip inválida/.test(x)),malformedQa.issues);

const invalidProjectDuration=qa.inspect({...baseProject,duration:'not-a-duration'},[cleanAsset]);
assert.equal(invalidProjectDuration.ok,false,invalidProjectDuration);
assert.equal(invalidProjectDuration.metrics.invalidTimingFields,1,invalidProjectDuration.metrics);
assert.ok(invalidProjectDuration.issues.includes('Duración de proyecto inválida.'),invalidProjectDuration.issues);

const ambiguousAssets=[
  {id:7,name:'first.mp4',type:'video',blob:readableBlob,width:1080,height:1920,duration:10},
  {id:' 7 ',name:'second.mp4',type:'video',blob:readableBlob,width:1080,height:1920,duration:10}
];
const collisions=guard.findCanonicalMediaCollisions(ambiguousAssets);
assert.deepEqual(collisions,[{key:'n:7',firstIndex:0,secondIndex:1}]);

const blocked=qa.inspect(baseProject,ambiguousAssets);
assert.equal(blocked.ok,false,blocked);
assert.equal(blocked.metrics.mediaIdentityCollisions,1,blocked.metrics);
assert.equal(blocked.issues.filter(x=>x.includes('IDs de medio ambiguos')).length,1,blocked.issues);
assert.ok(blocked.issues.some(x=>x.includes('first.mp4')&&x.includes('second.mp4')&&x.includes('"n:7"')),blocked.issues);
assert.ok(blocked.score<=clean.score-25,{clean:clean.score,blocked:blocked.score});

const zeroCollision=qa.inspect({...baseProject,clips:[{...baseProject.clips[0],asset:0}]},[
  {id:0,name:'zero-a.mp4',type:'video',blob:readableBlob,width:1080,height:1920,duration:10},
  {id:'0',name:'zero-b.mp4',type:'video',blob:readableBlob,width:1080,height:1920,duration:10}
]);
assert.equal(zeroCollision.metrics.mediaIdentityCollisions,1,zeroCollision.metrics);
assert.equal(zeroCollision.ok,false,zeroCollision);
assert.ok(zeroCollision.issues.some(x=>x.includes('"n:0"')),zeroCollision.issues);

console.log('QA media identity + legacy timing preflight OK');