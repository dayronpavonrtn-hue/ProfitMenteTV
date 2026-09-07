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
  sourceLegacyContentHash:'70f5bc0cbf5f28b86a75758f07ff4b85c9692110346037af8b93af71746f96c7',
  sourceHashVersion:'sample-v2',
  sourceRelativePath:'camera/day-1/original-video.mp4',
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
assert.equal(restored.assets[0].sourceLegacyContentHash,asset.sourceLegacyContentHash);
assert.equal(restored.assets[0].sourceHashVersion,asset.sourceHashVersion);
assert.equal(restored.assets[0].sourceRelativePath,asset.sourceRelativePath);
assert.equal(restored.assets[0].sourceLastModified,asset.sourceLastModified);
assert.equal(restored.assets[0].importOrigin,asset.importOrigin);
assert.equal(restored.project.assets[0].sourceContentHash,asset.sourceContentHash);
assert.equal(restored.project.assets[0].sourceLegacyContentHash,asset.sourceLegacyContentHash);
assert.equal(restored.project.assets[0].sourceHashVersion,asset.sourceHashVersion);
assert.equal(restored.project.assets[0].sourceRelativePath,asset.sourceRelativePath);
assert.equal(restored.project.assets[0].sourceFingerprint,asset.sourceFingerprint);
assert.equal(restored.project.assets[0].sourceLastModified,asset.sourceLastModified);
assert.equal(restored.project.assets[0].importOrigin,asset.importOrigin);
assert.deepEqual(new Uint8Array(await restored.assets[0].blob.arrayBuffer()),bytes);

const legacyBytes=new TextEncoder().encode('legacy-numeric-media-id');
const legacyAsset={
  id:90210,
  name:'legacy-number-id.mp4',
  type:'video',
  mime:'video/mp4',
  blob:new Blob([legacyBytes],{type:'video/mp4'}),
  size:legacyBytes.length,
  duration:2.5,
  width:1080,
  height:1920
};
const legacyProject={name:'Legacy numeric identity',format:'9:16',duration:2.5,clips:[{id:'legacy-clip',track:0,start:0,duration:2.5,asset:90210}],assets:[]};
const legacyBlob=await bundler.build(legacyProject,[legacyAsset]);
const legacyRestored=await bundler.parse(legacyBlob);
assert.equal(legacyRestored.assets[0].id,'90210','numeric media IDs must be canonicalized for export');
assert.equal(legacyRestored.project.clips[0].asset,'90210','clip references must canonicalize with media IDs');
assert.equal(legacyRestored.assets[0].name,'legacy-number-id.mp4');
assert.deepEqual(new Uint8Array(await legacyRestored.assets[0].blob.arrayBuffer()),legacyBytes);

await assert.rejects(
  ()=>bundler.build({name:'Invalid media',clips:[]},[{id:null,name:'broken.mp4',type:'video',blob:new Blob([legacyBytes])}]),
  /Medio sin identificador válido/,
  'invalid media IDs should fail with a clear export error'
);

console.log('Bundle media identity roundtrip QA OK');