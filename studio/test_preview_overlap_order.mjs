import fs from 'node:fs';
import assert from 'node:assert/strict';

const preview=fs.readFileSync(new URL('./preview-engine.js',import.meta.url),'utf8');
const renderer=fs.readFileSync(new URL('./render_mp4.py',import.meta.url),'utf8');

// Same-track overlaps must not depend on project.clips array order. The MP4 renderer
// establishes deterministic visual stacking by track and then clip start time; the
// browser preview must apply the same secondary key.
assert.match(
  preview,
  /\.sort\(\(a,b\)=>\(Number\(a\.track\)-Number\(b\.track\)\)\|\|\(Number\(a\.start\|\|0\)-Number\(b\.start\|\|0\)\)\)/,
  'preview must sort active visual clips by track and then start time'
);
assert.match(
  renderer,
  /sorted\(visual,key=lambda x:\(int\(x\.get\('track',0\)\),float\(x\.get\('start',0\)\)\)\)/,
  'MP4 renderer must keep the matching track/start visual order'
);

// Guard the concrete failure mode: a later-starting clip may appear earlier in the
// project array after edit/import operations, but deterministic ordering still places
// the earlier-starting clip first and the later-starting one on top.
const clips=[
  {id:'later',track:0,start:5},
  {id:'earlier',track:0,start:1},
  {id:'overlay',track:1,start:0}
];
const ordered=[...clips].sort((a,b)=>(Number(a.track)-Number(b.track))||(Number(a.start||0)-Number(b.start||0)));
assert.deepEqual(ordered.map(c=>c.id),['earlier','later','overlay']);

console.log('Preview/MP4 same-track overlap order parity OK');
