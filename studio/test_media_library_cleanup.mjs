import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const Tools=require('./media-library-tools.js');
const CrossProjectGuard=require('./media-library-cross-project-guard.js');

const project={
  clips:[
    {id:'c1',asset:'video-used'},
    {id:'c2',asset:'audio-used'},
    {id:'c3',asset:null},
    {id:'c4'}
  ],
  assets:[
    {id:'video-used',name:'used.mp4'},
    {id:'audio-used',name:'voice.wav'},
    {id:'old-image',name:'old.jpg'},
    {id:'old-audio',name:'old.wav'}
  ]
};
const assets=[
  {id:'video-used',name:'used.mp4',size:1000},
  {id:'audio-used',name:'voice.wav',blob:{size:2000}},
  {id:'old-image',name:'old.jpg',size:3000},
  {id:'old-audio',name:'old.wav',blob:{size:4000}}
];

assert.deepEqual([...Tools.usedIds(project)].sort(),['audio-used','video-used']);
assert.deepEqual(Tools.unused(project,assets).map(a=>a.id),['old-image','old-audio']);
assert.equal(Tools.unusedBytes(project,assets),7000);
assert.equal(Tools.usage(project,'video-used').length,1);
assert.equal(Tools.usage(project,'old-image').length,0);

const legacyIdentityProject={
  clips:[
    {id:'zero-number',asset:0},
    {id:'seven-number',asset:7},
    {id:'eight-spaced',asset:' 08 '},
    {id:'plain-text',asset:'clip-media'}
  ],
  assets:[
    {id:'00',name:'zero.mp4'},
    {id:'07',name:'seven.mp4'},
    {id:8,name:'eight.mp4'},
    {id:'clip-media',name:'text.mp4'},
    {id:'unused',name:'unused.mp4'}
  ]
};
const legacyIdentityAssets=[
  {id:'00',name:'zero.mp4',size:10},
  {id:'7.0',name:'seven.mp4',size:20},
  {id:8,name:'eight.mp4',size:30},
  {id:'clip-media',name:'text.mp4',size:40},
  {id:'unused',name:'unused.mp4',size:50},
  {id:null,name:'invalid.mp4',size:60}
];
assert.equal(Tools.mediaKey(0),'0');
assert.equal(Tools.mediaKey('00'),'0');
assert.equal(Tools.mediaKey('7.0'),'7');
assert.equal(Tools.mediaKey(' 08 '),'8');
assert.equal(Tools.mediaKey('clip-media'),'clip-media');
assert.equal(Tools.mediaKey(''),null);
assert.equal(Tools.mediaKey(null),null);
assert.equal(Tools.sameMediaId(7,'07'),true);
assert.equal(Tools.sameMediaId(7,'7.0'),true);
assert.equal(Tools.sameMediaId('clip-media',' clip-media '),true);
assert.deepEqual([...Tools.usedIds(legacyIdentityProject)].sort(),['0','7','8','clip-media']);
assert.equal(Tools.usage(legacyIdentityProject,'00').length,1,'asset id 0 must count as used');
assert.equal(Tools.usage(legacyIdentityProject,'07').length,1,'numeric/string aliases must resolve to the same used asset');
assert.deepEqual(Tools.unused(legacyIdentityProject,legacyIdentityAssets).map(a=>a.id),['unused'],'cleanup must never classify canonical aliases or asset 0 as unused');
assert.equal(Tools.unusedBytes(legacyIdentityProject,legacyIdentityAssets),50);

const zeroMetaProject={clips:[{id:'z',asset:0}],assets:[]};
Tools.preserveMeta(zeroMetaProject,{id:0,name:'zero.mp4',type:'video',mime:'video/mp4'});
assert.equal(zeroMetaProject.assets.length,1,'asset id 0 metadata must be preserved');
assert.equal(zeroMetaProject.assets[0].id,0);
Tools.preserveMeta(zeroMetaProject,{id:'00',name:'zero-renamed.mp4',type:'video'});
assert.equal(zeroMetaProject.assets.length,1,'canonical aliases must update metadata instead of duplicating it');
assert.equal(zeroMetaProject.assets[0].name,'zero-renamed.mp4');

const legacyMetaProject={assets:[{id:0},{id:'07'},{id:'keep'}]};
Tools.pruneProjectAssetMeta(legacyMetaProject,['00',7]);
assert.deepEqual(legacyMetaProject.assets.map(a=>a.id),['keep'],'metadata pruning must use canonical media identity');

const proxyAsset={
  id:'proxy-video',type:'video',name:'source.mov',
  blob:new Blob([new Uint8Array(12)]),previewBlob:new Blob([new Uint8Array(5)]),
  previewMime:'video/mp4',proxySourceFingerprint:'fp',proxySize:5,proxyGeneratedAt:123,
  sourceFingerprint:'fp',sourceContentHash:'hash'
};
assert.equal(Tools.assetBytes(proxyAsset),17,'storage accounting must include original and proxy');
assert.deepEqual(Tools.proxyAssets([proxyAsset]).map(a=>a.id),['proxy-video']);
assert.equal(Tools.proxyBytes([proxyAsset]),5);
const released=Tools.dropProxy(proxyAsset,true);
assert.equal(released,5);
assert.equal(proxyAsset.blob.size,12,'proxy cleanup must preserve original media');
assert.equal(proxyAsset.sourceFingerprint,'fp','proxy cleanup must preserve relink/render identity');
assert.equal(proxyAsset.sourceContentHash,'hash');
assert.equal(proxyAsset.previewBlob,undefined);
assert.equal(proxyAsset.proxySize,undefined);
assert.equal(proxyAsset.proxyAutoDisabled,true,'manual cleanup must prevent immediate proxy recreation');
assert.deepEqual(Tools.suppressedProxyAssets([proxyAsset]).map(a=>a.id),['proxy-video']);
Tools.enableProxy(proxyAsset);
assert.equal(proxyAsset.proxyAutoDisabled,undefined);
assert.equal(Tools.suppressedProxyAssets([proxyAsset]).length,0);

const unusedWithProxy={id:'unused-proxy',type:'video',blob:new Blob([new Uint8Array(9)]),previewBlob:new Blob([new Uint8Array(4)])};
assert.equal(Tools.unusedBytes({clips:[]},[unusedWithProxy]),13,'unused cleanup estimate must include proxy bytes');

const copy=structuredClone(project);
Tools.pruneProjectAssetMeta(copy,['old-image','old-audio']);
assert.deepEqual(copy.assets.map(a=>a.id),['video-used','audio-used']);
assert.equal(copy.clips.length,4,'cleanup must never remove timeline clips');

const relinkProject={clips:[{id:'c',asset:'missing'}],assets:[]};
Tools.preserveMeta(relinkProject,{id:'missing',name:'source.mp4',type:'video',mime:'video/mp4',sourceContentHash:'abc123',sourceFingerprint:'fp'});
assert.equal(relinkProject.assets[0].sourceContentHash,'abc123');
assert.equal(relinkProject.assets[0].sourceFingerprint,'fp');

const savedRows=[
  {id:'other-project',project:{libraryId:'other-project',clips:[{id:'other-c1',asset:'old-image'}]}}
];
const storage={getItem:key=>key==='profitmente-project-library'?JSON.stringify(savedRows):null};
assert.deepEqual(CrossProjectGuard.readSavedProjects(storage).map(p=>p.libraryId),['other-project']);
assert.deepEqual([...CrossProjectGuard.usedIdsAcross(CrossProjectGuard.projectScope(project,CrossProjectGuard.readSavedProjects(storage)))].sort(),['audio-used','old-image','video-used']);
CrossProjectGuard.install(Tools,{storage});
assert.deepEqual(Tools.unused(project,assets).map(a=>a.id),['old-audio'],'cleanup must preserve media referenced by another saved project');
assert.equal(Tools.unusedBytes(project,assets),4000,'cleanup byte estimate must exclude cross-project media');

const guardedAgain=CrossProjectGuard.install(Tools,{storage:{getItem:()=>'{broken json'}});
assert.equal(guardedAgain,Tools,'guard installation must be idempotent');
assert.deepEqual(Tools.unused(project,assets).map(a=>a.id),['old-audio'],'idempotent install must keep the original saved-project storage source');

assert.deepEqual(CrossProjectGuard.readSavedProjects({getItem:()=>'{broken json'}),[],'corrupt project library must fail closed without crashing cleanup');
assert.deepEqual(CrossProjectGuard.unusedAcross([{clips:[{asset:'x'}]}],[{id:'x'},{id:'y'}]).map(a=>a.id),['y']);
assert.deepEqual([...CrossProjectGuard.usedIdsAcross([{clips:[{asset:0},{asset:7},{asset:' 8 '},{asset:'09'},{asset:'10.0'}]}])].sort(),['0','10','7','8','9'],'legacy numeric media ids must normalize to stable keys');
assert.deepEqual(CrossProjectGuard.unusedAcross(
  [{clips:[{asset:0},{asset:7},{asset:' 8 '},{asset:'09'},{asset:'10.0'}]}],
  [{id:'00'},{id:'07'},{id:8},{id:9},{id:10},{id:'unused'},{id:null}]
).map(a=>a.id),['unused'],'cleanup must preserve numeric/string equivalent ids and aliases across saved projects while ignoring invalid ids');

console.log('media library cleanup QA ok');
