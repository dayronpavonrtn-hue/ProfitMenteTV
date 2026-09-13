const fs = require('fs');
const assert = require('assert');

const src = fs.readFileSync('studio/app.js', 'utf8');
const start = src.indexOf('async function renderAt(t)');
const end = src.indexOf("\n$('#playhead').oninput", start);
assert(start >= 0 && end > start, 'renderAt source not found');
const renderSource = src.slice(start, end).replace('async function renderAt(t)', 'async function renderAtUnderTest(t)');
const renderAt = eval(`${renderSource}\nrenderAtUnderTest`);

let previewRenderVersion = 0;
const canvas = { width: 1080, height: 1920 };
const placeholder = { hidden: false };
const previewVideo = {
  videoWidth: 0,
  videoHeight: 0,
  addEventListener() {},
  removeEventListener() {},
  load() {},
};
const $ = selector => selector === '#placeholder' ? placeholder : previewVideo;
const draws = [];
const ctx = {
  clearRect() {}, fillRect() {}, fillText() {},
  drawImage(image) { draws.push(image.marker); },
  set fillStyle(_) {}, set font(_) {}, set textAlign(_) {},
};
function scalarText(v){if(typeof v==='number')return Number.isFinite(v)?String(v):null;if(typeof v!=='string')return null;let s=v.trim();return s||null}
function numberValue(v){let s=scalarText(v);if(s===null)return null;let n=Number(s);return Number.isFinite(n)?n:null}
function idKey(v){let s=scalarText(v);if(s===null)return null;if(/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(s)){let n=Number(s);if(Number.isFinite(n))return `n:${Object.is(n,-0)?0:n}`}return `s:${s}`}
function sameId(a,b){let x=idKey(a),y=idKey(b);return x!==null&&x===y}
function trackId(v){let n=numberValue(v);return Number.isInteger(n)&&n>=0&&n<7?n:null}
function clipWindow(c){let start=numberValue(c?.start),duration=numberValue(c?.duration);return start!==null&&duration!==null&&duration>0?{start,duration}:null}

const assets = [{ id: 'image-1', type: 'image', blob: {} }];
const project = {
  mode: 'Manual',
  clips: [
    { id: 'clip-1', track: 0, start: 0, duration: 10, asset: 'image-1' },
    { id: 'caption-1', track: 3, start: 0, duration: 10, name: 'caption' },
  ],
};
async function assetUrl() { return 'blob:test'; }
const revoked = [];
const URL = { revokeObjectURL(url) { revoked.push(url); } };
const pendingImages = [];
class Image {
  constructor() { this.width = 100; this.height = 100; this.marker = pendingImages.length + 1; pendingImages.push(this); }
  set src(_) {}
}

(async () => {
  const first = renderAt(1);
  await Promise.resolve();
  assert.strictEqual(pendingImages.length, 1, 'first render should begin image load');

  const second = renderAt(2);
  await Promise.resolve();
  assert.strictEqual(pendingImages.length, 2, 'second render should begin without waiting for first');

  pendingImages[1].onload();
  assert.strictEqual(await second, true, 'newest render should complete');
  assert.deepStrictEqual(draws, [2], 'newest image should be drawn');

  pendingImages[0].onload();
  assert.strictEqual(await first, false, 'stale render should abort');
  assert.deepStrictEqual(draws, [2], 'stale image must not overwrite newest frame');
  assert.strictEqual(revoked.length, 2, 'both object URLs should be released');

  console.log('ProfitMente preview render race regression: OK');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
