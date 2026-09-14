import assert from 'node:assert/strict';

globalThis.window=globalThis;
globalThis.document=undefined;
globalThis.ProfitMenteRenderJobClient=class {};

await import('./bundle-engine.js');
await import('./bundle-render-job-integration.js');

const engine=new globalThis.ProfitMenteBundleEngine();
const longName='very-long-media-name-'+('segment-'.repeat(24))+'clip.mp4';
const assets=[
  {id:'abcdefgh-media-one',name:longName,type:'video',mime:'video/mp4',blob:new Blob(['FIRST'])},
  {id:'abcdefgh-media-two',name:longName,type:'video',mime:'video/mp4',blob:new Blob(['SECOND'])},
  {id:'short-media-three',name:'normal clip.mp4',type:'video',mime:'video/mp4',blob:new Blob(['THIRD'])}
];
const project={name:'Bundle path safety',clips:[
  {id:'c1',asset:'abcdefgh-media-one',start:0,duration:1},
  {id:'c2',asset:'abcdefgh-media-two',start:1,duration:1},
  {id:'c3',asset:'short-media-three',start:2,duration:1}
]};

const blob=await engine.build(project,assets);
const bytes=new Uint8Array(await blob.arrayBuffer());
const tarNames=[];
let offset=0;
while(offset+512<=bytes.length){
  const header=bytes.slice(offset,offset+512);
  if(header.every(x=>x===0))break;
  const name=engine.readString(header,0,100);
  const size=parseInt(engine.readString(header,124,12)||'0',8);
  tarNames.push(name);
  assert.ok(name.length<=100,`TAR entry exceeds legacy name field: ${name.length}`);
  offset+=512+Math.ceil(size/512)*512;
}
assert.equal(new Set(tarNames).size,tarNames.length,'bundle must not contain duplicate TAR paths');
const assetEntries=tarNames.filter(name=>name.startsWith('assets/'));
assert.equal(assetEntries.length,3,'all media files must have distinct TAR entries');

const restored=await engine.parse(blob);
assert.equal(restored.assets.length,3);
assert.deepEqual(await Promise.all(restored.assets.map(a=>a.blob.text())),['FIRST','SECOND','THIRD'],'distinct assets sharing the same first 8 id characters must round-trip independently');
assert.equal(restored.assets[2].name,'normal_clip.mp4','transport marker must be removed after import');
assert.equal(restored.project.assets[2].name,'normal_clip.mp4','project manifest and restored media names must stay aligned');
assert.ok(!restored.assets[0].name.startsWith('pm000000__'),'internal transport marker must not leak into the media library');
assert.ok(!restored.assets[1].name.startsWith('pm000001__'),'internal transport marker must not leak into the media library');
assert.equal(restored.project.clips[0].asset,'abcdefgh-media-one');
assert.equal(restored.project.clips[1].asset,'abcdefgh-media-two');

console.log('Bundle TAR path safety regression passed');