import fs from 'node:fs';
import assert from 'node:assert/strict';

const preview=fs.readFileSync(new URL('./preview-engine.js',import.meta.url),'utf8');
const renderer=fs.readFileSync(new URL('./render_mp4.py',import.meta.url),'utf8');

// Same-track overlaps must not depend on project.clips array order. The MP4 renderer
// establishes deterministic visual stacking by track and then clip start time; the
// browser preview must apply the same secondary key while using its hardened track
// identity and validated clip timing.
assert.match(
  preview,
  /\.sort\(\(a,b\)=>\(canonicalTrack\(a\.track\)-canonicalTrack\(b\.track\)\)\|\|\(\(clipWindow\(a\)\?\.start\|\|0\)-\(clipWindow\(b\)\?\.start\|\|0\)\)\)/,
  'preview must sort active visual clips by canonical track and then validated start time'
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
const finiteNumber=value=>{
  if(typeof value==='number')return Number.isFinite(value)?value:null;
  if(typeof value!=='string'||!value.trim())return null;
  const parsed=Number(value);
  return Number.isFinite(parsed)?parsed:null;
};
const clipWindow=clip=>{
  const start=finiteNumber(clip?.start),duration=finiteNumber(clip?.duration);
  return start!==null&&duration!==null&&start>=0&&duration>0?{start,duration,end:start+duration}:null;
};
const clips=[
  {id:'later',track:'00',start:5,duration:2},
  {id:'earlier',track:0,start:1,duration:2},
  {id:'overlay',track:'+01.0',start:0,duration:2}
];
const ordered=[...clips].sort((a,b)=>(canonicalTrack(a.track)-canonicalTrack(b.track))||((clipWindow(a)?.start||0)-(clipWindow(b)?.start||0)));
assert.deepEqual(ordered.map(c=>c.id),['earlier','later','overlay']);

console.log('Preview/MP4 same-track overlap order parity OK');
