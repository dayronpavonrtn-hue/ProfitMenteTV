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
