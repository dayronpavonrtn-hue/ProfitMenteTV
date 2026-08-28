import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const DnD=require('./media-timeline-dnd.js');

assert.deepEqual(DnD.allowedTracks('video'),[0,1]);
assert.deepEqual(DnD.allowedTracks('image'),[0,1]);
assert.deepEqual(DnD.allowedTracks('audio'),[4,5,6]);
assert.deepEqual(DnD.allowedTracks('text'),[]);
assert.equal(DnD.canDrop('video',0),true);
assert.equal(DnD.canDrop('video',5),false);
assert.equal(DnD.canDrop('audio',6),true);
assert.equal(DnD.canDrop('audio',1),false);

let p=DnD.placement({type:'video',duration:12},150,100,200,40);
assert.ok(Math.abs(p.start-10)<1e-9);
assert.equal(p.duration,12);

p=DnD.placement({type:'image'},295,100,200,40);
assert.ok(Math.abs(p.start-39)<1e-9);
assert.ok(Math.abs(p.duration-1)<1e-9);

p=DnD.placement({type:'audio',duration:30},500,100,200,40);
assert.ok(Math.abs(p.start-39.75)<1e-9);
assert.equal(p.duration,.25);

p=DnD.placement({type:'audio'},0,100,200,20);
assert.equal(p.start,0);
assert.equal(p.duration,8);

console.log('media timeline drag-drop QA OK');
