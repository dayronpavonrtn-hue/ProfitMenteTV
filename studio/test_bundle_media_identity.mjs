import assert from 'node:assert/strict';
import {createRequire} from 'node:module';

globalThis.window={addEventListener(){}};
const require=createRequire(import.meta.url);
const {ProfitMenteBundleEngine}=require('./bundle-engine.js');

const bundler=new ProfitMenteBundleEngine();
const bytes=new TextEncoder().encode('same-media-payload-for-profitmente');
const asset={
  id:'12345678-1234-1234-1234-123456789abc',
  name:'original-video.mp4',
  type:'video',
  mime:'video/mp4',
  blob:new Blob([bytes],{type:'video/mp4'}),
  size:bytes.length,
  duration:4.2,
  width:1080,
  height:1920,
  sourceFingerprint:'original-video.mp4|34|video/mp4|1770000000000',
  sourceContentHash:'d1b67bdce55d102701952d93a5c8b7e69b7800e9b53d8319d5a0dfba357eb027',
  sourceLastModified:1770000000000,
  importOrigin:'drag-drop'
};
const project={name:'Bundle identity QA',format:'9:16',duration:4.2,clips:[{id:'clip-1',track:0,start:0,duration:4.2,asset:asset.id}],assets:[]};

const blob=await bundler.build(project,[asset]);
const restored=await bundler.parse(blob);
assert.equal(restored.project.version,'1.8');
assert.equal(restored.assets.length,1);
assert.equal(restored.assets[0].name,'original-video.mp4');
assert.equal(restored.assets[0].sourceFingerprint,asset.sourceFingerprint);
assert.equal(restored.assets[0].sourceContentHash,asset.sourceContentHash);
assert.equal(restored.assets[0].sourceLastModified,asset.sourceLastModified);
assert.equal(restored.assets[0].importOrigin,asset.importOrigin);
assert.equal(restored.project.assets[0].sourceContentHash,asset.sourceContentHash);
assert.equal(restored.project.assets[0].sourceFingerprint,asset.sourceFingerprint);
assert.equal(restored.project.assets[0].sourceLastModified,asset.sourceLastModified);
assert.equal(restored.project.assets[0].importOrigin,asset.importOrigin);
assert.deepEqual(new Uint8Array(await restored.assets[0].blob.arrayBuffer()),bytes);

console.log('Bundle media identity roundtrip QA OK');