import fs from 'node:fs';
import assert from 'node:assert/strict';

const preview=fs.readFileSync(new URL('./preview-engine.js',import.meta.url),'utf8');
const renderer=fs.readFileSync(new URL('./render_mp4.py',import.meta.url),'utf8');

// Same-track overlaps must not depend on project.clips array order. The MP4 renderer
// establishes deterministic visual stacking by track and then clip start time; the
// browser preview must apply the same secondary key while using its hardened track identity.
assert.match(
  preview,
  /\.sort\(\(a,b\)=>\(canonicalTrack\(a\.track\)-canonicalTrack\(b\.track\)\)\|\|\(Number\(a\.start\|\|0\)-Number\(b\.start\|\|0\)\)\)/,
  'preview must sort active visual clips by canonical track and then start time'
);
assert.match(
  renderer,
  /sorted\(visual,key=lambda x:\(int\(x\.get\('track',0\)\),float\(x\.get\('start',0\)\)\)\)/,
  'MP4 renderer must keep the matching track/start visual order'
);

// Guard the concrete failure mode: a later-starting clip may appear earlier in the
// project array after edit/import operations, but deterministic ordering still places
// the earlier-starting clip first and the later-starting one on top.
const canonicalTrack=value=>{
  if(value===null||value===undefined||typeof value==='boolean'||typeof value==='symbol'||typeof value==='object')return null;
  const raw=String(value).trim();
  if(!raw||!/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(raw))return null;
  const parsed=Number(raw);
  return Number.isInteger(parsed)&&parsed>=0?(Object.is(parsed,-0)?0:parsed):null;
};
const clips=[
  {id:'later',track:'00',start:5},
  {id:'earlier',track:0,start:1},
  {id:'overlay',track:'+01.0',start:0}
];
const ordered=[...clips].sort((a,b)=>(canonicalTrack(a.track)-canonicalTrack(b.track))||(Number(a.start||0)-Number(b.start||0)));
assert.deepEqual(ordered.map(c=>c.id),['earlier','later','overlay']);

console.log('Preview/MP4 same-track overlap order parity OK');
