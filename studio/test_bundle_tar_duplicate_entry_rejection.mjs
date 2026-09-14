import assert from 'node:assert/strict';

globalThis.window=globalThis;
globalThis.document=undefined;

await import('./bundle-engine.js');

const engine=new globalThis.ProfitMenteBundleEngine();
const enc=new TextEncoder();
const projectBytes=enc.encode(JSON.stringify({name:'duplicate entry test',clips:[],assets:[]}));
const pad=bytes=>new Uint8Array((512-bytes.length%512)%512);
const duplicateProjectTar=new Blob([
  engine.header('project.json',projectBytes.length),projectBytes,pad(projectBytes),
  engine.header('project.json',projectBytes.length),projectBytes,pad(projectBytes),
  new Uint8Array(1024)
],{type:'application/x-tar'});

await assert.rejects(
  ()=>engine.parse(duplicateProjectTar),
  /rutas duplicadas: project\.json/,
  'bundle parser must reject duplicate TAR paths instead of silently overwriting the first entry'
);

const assetBytes=enc.encode('FIRST');
const assetPath='assets/media-one-pm000000__clip.mp4';
const manifestBytes=enc.encode(JSON.stringify({
  name:'duplicate asset test',
  clips:[{id:'c1',asset:'media-one',start:0,duration:1}],
  assets:[{id:'media-one',name:'media-one-pm000000__clip.mp4',type:'video',mime:'video/mp4'}]
}));
const duplicateAssetTar=new Blob([
  engine.header('project.json',manifestBytes.length),manifestBytes,pad(manifestBytes),
  engine.header(assetPath,assetBytes.length),assetBytes,pad(assetBytes),
  engine.header(assetPath,assetBytes.length),assetBytes,pad(assetBytes),
  new Uint8Array(1024)
],{type:'application/x-tar'});

await assert.rejects(
  ()=>engine.parse(duplicateAssetTar),
  /rutas duplicadas: assets\//,
  'bundle parser must reject duplicate media TAR paths'
);

console.log('Bundle duplicate TAR entry rejection regression passed');