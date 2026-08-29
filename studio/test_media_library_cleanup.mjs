import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const Tools=require('./media-library-tools.js');

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

const copy=structuredClone(project);
Tools.pruneProjectAssetMeta(copy,['old-image','old-audio']);
assert.deepEqual(copy.assets.map(a=>a.id),['video-used','audio-used']);
assert.equal(copy.clips.length,4,'cleanup must never remove timeline clips');

const relinkProject={clips:[{id:'c',asset:'missing'}],assets:[]};
Tools.preserveMeta(relinkProject,{id:'missing',name:'source.mp4',type:'video',mime:'video/mp4',sourceContentHash:'abc123',sourceFingerprint:'fp'});
assert.equal(relinkProject.assets[0].sourceContentHash,'abc123');
assert.equal(relinkProject.assets[0].sourceFingerprint,'fp');

console.log('media library cleanup QA ok');
