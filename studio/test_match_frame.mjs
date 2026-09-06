import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const Engine=require('./match-frame-engine.js');
const e=new Engine();

const video={id:'v1',type:'video',duration:20};
const audio={id:'a1',type:'audio',duration:12};
let clip={id:'c1',asset:'v1',track:0,start:5,duration:4,sourceOffset:2,speed:1.5};
let r=e.sourceTimeAt(clip,7,video);
assert.equal(r.ok,true);
assert.equal(r.time,5,'sourceOffset + local time × speed must map exactly');
assert.equal(r.assetId,'v1');

r=e.sourceTimeAt(clip,4.99,video);
assert.equal(r.ok,false);
assert.equal(r.reason,'playhead-outside');

clip={id:'c2',asset:'a1',track:2,start:0,duration:5,sourceOffset:10,speed:2};
r=e.sourceTimeAt(clip,5,audio);
assert.equal(r.ok,true);
assert.ok(r.time<12&&r.time>11.99,'source lookup must clamp to physical media duration');

clip={id:'freeze',asset:'png1',freezeOriginalAsset:'v1',freezeFrameSource:8.25,track:0,start:3,duration:6,sourceOffset:0,speed:1};
r=e.sourceTimeAt(clip,7,video);
assert.equal(r.time,8.25,'freeze frames must resolve back to their original source frame');
assert.equal(r.assetId,'v1');

const clips=[
  {id:'aud',track:2,start:0,duration:10},
  {id:'overlay',track:1,start:0,duration:10},
  {id:'main',track:0,start:0,duration:10}
];
assert.equal(e.chooseClip(clips,4,'aud').id,'aud','selected clip under playhead must win');
assert.equal(e.chooseClip(clips,4,null).id,'main','without selection, primary visual track must win');
assert.equal(e.chooseClip(clips,11,null),null,'no clip outside edit boundaries');

const legacyClips=[
  {id:'007',asset:'+07.000',track:1,start:0,duration:10},
  {id:'main',asset:'v1',track:0,start:0,duration:10}
];
assert.equal(e.chooseClip(legacyClips,4,7).id,'007','legacy numeric clip aliases must preserve the explicit selection');
assert.equal(e.sameId('7.0','+07.000'),true);
assert.equal(e.sameId('-0',0),true);
assert.equal(e.sameId('Media-A','media-a'),false);
assert.equal(e.sameId(false,0),false);
const legacyAsset={id:'007',type:'video',duration:9};
assert.equal(e.findAsset([legacyAsset],7),legacyAsset,'Match Frame must resolve a legacy asset alias to the original media');
assert.equal(e.findAsset([{id:'Media-A'}],'media-a'),null,'text media IDs remain case-sensitive');

const integration=fs.readFileSync(new URL('./match-frame-integration.js',import.meta.url),'utf8');
const bootstrap=fs.readFileSync(new URL('./feature-bootstrap.js',import.meta.url),'utf8');
assert.match(integration,/engine\.findAsset/,'integration must use canonical asset lookup');
assert.match(integration,/monitor\.open\(asset\)/,'integration must open the existing source monitor');
assert.match(integration,/sourceMonitorSeek/,'integration must seek the source monitor');
assert.match(integration,/e\.key\.toLowerCase\(\)===['"]f['"]/,'F shortcut must invoke Match Frame');
assert.match(bootstrap,/match-frame-engine\.js/,'bootstrap must load Match Frame engine');
assert.match(bootstrap,/match-frame-integration\.js/,'bootstrap must load Match Frame integration');
console.log('Match Frame regression: OK');
