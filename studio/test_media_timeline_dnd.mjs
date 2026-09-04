import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const DnD=require('./media-timeline-dnd.js');

assert.deepEqual(DnD.allowedTracks('video'),[0,1]);
assert.deepEqual(DnD.allowedTracks('image'),[0,1]);
assert.deepEqual(DnD.allowedTracks('audio'),[4,5,6]);
assert.deepEqual(DnD.allowedTracks('text'),[]);
assert.equal(DnD.canDrop('video',0),true);
assert.equal(DnD.canDrop('video','00'),true,'legacy integer aliases remain valid video tracks');
assert.equal(DnD.canDrop('video','1.0'),true,'integer decimal aliases normalize to canonical tracks');
assert.equal(DnD.canDrop('video',5),false);
assert.equal(DnD.canDrop('audio',6),true);
assert.equal(DnD.canDrop('audio','04'),true,'legacy audio aliases remain valid');
assert.equal(DnD.canDrop('audio','6.0'),true,'canonical audio aliases remain valid');
assert.equal(DnD.canDrop('audio',1),false);
assert.equal(DnD.canDrop('video',''),false,'empty track values must never coerce to track 0');
assert.equal(DnD.canDrop('video',null),false,'null track values must never coerce to track 0');
assert.equal(DnD.canDrop('audio',6.5),false,'fractional tracks are invalid');
assert.equal(DnD.canDrop('audio',7),false,'out-of-range tracks are invalid');

assert.equal(DnD.mediaKey(0),'n:0','asset id 0 must be a real media identity');
assert.equal(DnD.sameMediaId(0,'0'),true);
assert.equal(DnD.sameMediaId(7,' 07 '),true,'numeric/string media aliases must resolve identically');
assert.equal(DnD.sameMediaId('asset-a',' asset-a '),true,'string media ids normalize surrounding whitespace');
assert.equal(DnD.sameMediaId('',0),false,'empty media references must stay invalid');
const identityAssets=[{id:0,name:'Zero'},{id:7,name:'Seven'},{id:'asset-a',name:'Named'}];
assert.equal(DnD.findAsset(identityAssets,'0')?.name,'Zero','dataset string 0 must resolve numeric asset id 0');
assert.equal(DnD.findAsset(identityAssets,'07')?.name,'Seven','dataset aliases must resolve numeric assets');
assert.equal(DnD.findAsset(identityAssets,' asset-a ')?.name,'Named');
assert.equal(DnD.findAsset(identityAssets,''),null);

const readableBlob={size:1024,arrayBuffer:async()=>new ArrayBuffer(0)};
assert.equal(DnD.assetUsable(null,{browser:true}),false,'missing assets must never be placed');
assert.equal(DnD.assetUsable({type:'video',mediaReadable:false,blob:readableBlob},{browser:true}),false,'known undecodable media must be rejected');
assert.equal(DnD.assetUsable({type:'video',blob:{size:0,arrayBuffer:readableBlob.arrayBuffer}},{browser:true}),false,'empty local blobs must be rejected');
assert.equal(DnD.assetUsable({type:'video'},{browser:true}),false,'browser placement requires a locally available blob');
assert.equal(DnD.assetUsable({type:'video'},{browser:false}),true,'metadata-only checks outside the browser must not invent an offline state');
assert.equal(DnD.assetUsable({type:'video',blob:readableBlob},{browser:true}),true,'readable local media remains placeable');
assert.equal(DnD.canDropAsset({type:'video',mediaReadable:false,blob:readableBlob},0,{browser:true}),false,'unreadable media must not pass compatible-track checks');
assert.equal(DnD.canDropAsset({type:'video',blob:readableBlob},0,{browser:true}),true,'usable video remains droppable on video tracks');
assert.equal(DnD.canDropAsset({type:'video',blob:readableBlob},5,{browser:true}),false,'usable media must still honor track compatibility');
assert.equal(DnD.canDropAsset({type:'video',blob:readableBlob},'',{browser:true}),false,'empty lane track must not masquerade as video track 0');

let p=DnD.placement({type:'video',duration:12},150,100,200,40);
assert.ok(Math.abs(p.start-10)<1e-9);
assert.equal(p.duration,12);
assert.equal(p.end,22);

p=DnD.placement({type:'image'},295,100,200,40);
assert.ok(Math.abs(p.start-39)<1e-9);
assert.equal(p.duration,5,'image drop near project end must preserve default still duration');
assert.equal(p.end,44,'placement must expose the required project end for timeline growth');

p=DnD.placement({type:'audio',duration:30},500,100,200,40);
assert.equal(p.start,40,'drop past the lane right edge must clamp to the current project end');
assert.equal(p.duration,30,'audio drop must never be truncated just to fit the current project duration');
assert.equal(p.end,70);

p=DnD.placement({type:'audio'},0,100,200,20);
assert.equal(p.start,0);
assert.equal(p.duration,8);
assert.equal(p.end,8);

p=DnD.placement({type:'video',duration:.1},100,100,200,20);
assert.equal(p.duration,.25,'very short or invalid media duration must retain minimum editable duration');
assert.equal(p.end,.25);

console.log('media timeline drag-drop QA OK');
