import assert from 'node:assert/strict';

globalThis.window=globalThis;
globalThis.document=undefined;

await import('./bundle-engine.js');

const engine=new globalThis.ProfitMenteBundleEngine();
const longName='standalone-long-media-'+('segment-'.repeat(24))+'clip.mp4';
const assets=[
  {id:'abcdefgh-core-one',name:longName,type:'video',mime:'video/mp4',blob:new Blob(['CORE-FIRST'])},
  {id:'abcdefgh-core-two',name:longName,type:'video',mime:'video/mp4',blob:new Blob(['CORE-SECOND'])},
  {id:'short-core-three',name:'normal clip.mp4',type:'video',mime:'video/mp4',blob:new Blob(['CORE-THIRD'])}
];
const project={name:'Standalone bundle core safety',clips:[
  {id:'c1',asset:'abcdefgh-core-one',start:0,duration:1},
  {id:'c2',asset:'abcdefgh-core-two',start:1,duration:1},
  {id:'c3',asset:'short-core-three',start:2,duration:1}
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
  assert.ok(name.length<=100,`standalone TAR entry exceeds legacy name field: ${name.length}`);
  offset+=512+Math.ceil(size/512)*512;
}
assert.equal(new Set(tarNames).size,tarNames.length,'standalone bundle core must not create duplicate TAR paths');
assert.equal(tarNames.filter(name=>name.startsWith('assets/')).length,3,'standalone bundle core must preserve every media entry');

const restored=await engine.parse(blob);
assert.equal(restored.assets.length,3);
assert.deepEqual(await Promise.all(restored.assets.map(asset=>asset.blob.text())),['CORE-FIRST','CORE-SECOND','CORE-THIRD']);
assert.equal(restored.assets[2].name,'normal_clip.mp4','core transport marker must be removed without browser integration');
assert.equal(restored.project.assets[2].name,'normal_clip.mp4','core project manifest names must match restored media names');
assert.ok(restored.assets.every(asset=>!/^pm[0-9a-z]{6}__/i.test(asset.name)),'core transport markers must never leak into restored media names');
assert.equal(restored.project.clips[0].asset,'abcdefgh-core-one');
assert.equal(restored.project.clips[1].asset,'abcdefgh-core-two');

console.log('Standalone bundle core TAR path safety regression passed');