import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('./caption-preview.js',import.meta.url),'utf8');
const sandbox={
  renderAt:async()=>{},
  project:{clips:[],trackState:{}},
  window:{},
  canvas:{width:540,height:960},
  ctx:{},
  console
};
vm.createContext(sandbox);
vm.runInContext(source,sandbox,{filename:'caption-preview.js'});
const {normalizeWordTimings,finiteNumber,canonicalTrack,activeCaptionFallback}=sandbox.window.ProfitMenteCaptionPreview;

assert.equal(finiteNumber(true),null,'booleans must not be accepted as numeric timing values');
assert.equal(finiteNumber({value:1}),null,'objects must not be coerced into timing values');
assert.equal(finiteNumber('  '),null,'blank strings must not be accepted');
assert.equal(finiteNumber('1.25'),1.25,'numeric strings should remain compatible');
assert.equal(canonicalTrack('3.0'),3,'legacy numeric-string track aliases should remain compatible');
assert.equal(canonicalTrack(false),null,'boolean track values must not be coerced to track zero');
assert.equal(canonicalTrack([3]),null,'array track values must not be coerced to caption track three');
assert.equal(canonicalTrack('3.5'),null,'fractional track values must be rejected');

sandbox.project.clips=[
  {id:'ok-number',track:3,start:10,duration:2},
  {id:'ok-string',track:'3.0',start:'10',duration:'2'},
  {id:'bad-track-array',track:[3],start:10,duration:2},
  {id:'bad-start-array',track:3,start:[10],duration:2},
  {id:'bad-duration-bool',track:3,start:10,duration:true},
  {id:'zero-duration',track:3,start:10,duration:0}
];
assert.deepEqual(
  Array.from(activeCaptionFallback(10.5),clip=>clip.id),
  ['ok-number','ok-string'],
  'fallback caption selection must preserve legacy numeric strings without coercing corrupt track or timing values'
);
assert.deepEqual(Array.from(activeCaptionFallback(false)),[],'invalid playhead values must not activate captions');

assert.deepEqual(
  JSON.parse(JSON.stringify(normalizeWordTimings({
    track:3,start:10,duration:4,wordTimingMode:'relative',
    wordTimings:[
      {word:'Hola',start:0,end:1},
      {word:'mundo',start:1,duration:1.5},
      {word:'fin',start:3.5,end:5}
    ]
  }))),
  [
    {word:'Hola',start:10,end:11,duration:1},
    {word:'mundo',start:11,end:12.5,duration:1.5},
    {word:'fin',start:13.5,end:14,duration:.5}
  ],
  'relative timings must be converted to absolute timeline time and clipped to the caption'
);

assert.deepEqual(
  JSON.parse(JSON.stringify(normalizeWordTimings({
    track:3,start:10,duration:4,wordTimingMode:'absolute',
    wordTimings:[
      {text:'dos',start:12,duration:1},
      {word:'uno',start:10,end:11},
      {word:'fuera',start:20,end:21},
      {word:'malo',start:false,end:13},
      {word:'invertido',start:13,end:12}
    ]
  }))),
  [
    {word:'uno',start:10,end:11,duration:1},
    {word:'dos',start:12,end:13,duration:1}
  ],
  'absolute timings must be sorted and invalid/out-of-range values discarded'
);

assert.deepEqual(
  JSON.parse(JSON.stringify(normalizeWordTimings({
    track:3,start:8,duration:3,
    wordTimings:[
      {word:'auto',start:0,end:1},
      {word:'detecta',start:1,end:2.5}
    ]
  }))),
  [
    {word:'auto',start:8,end:9,duration:1},
    {word:'detecta',start:9,end:10.5,duration:1.5}
  ],
  'legacy clip-relative timings should be detected when they clearly fall inside the clip duration'
);

assert.deepEqual(
  JSON.parse(JSON.stringify(normalizeWordTimings({
    track:3,start:2,duration:2,
    wordTimings:[
      {word:'A',start:2,end:2.8},
      {word:'B',start:2.8,duration:.7}
    ]
  }))),
  [
    {word:'A',start:2,end:2.8,duration:.7999999999999998},
    {word:'B',start:2.8,end:3.5,duration:.7000000000000002}
  ],
  'existing absolute Studio timings must remain absolute'
);

const previewSource=fs.readFileSync(new URL('./preview-engine.js',import.meta.url),'utf8');
const previewSandbox={
  renderAt:async()=>{},
  project:{clips:[],trackState:{}},
  assets:[],
  window:{ProfitMenteCaptionPreview:{normalizeWordTimings}},
  canvas:{width:540,height:960},
  ctx:{},
  console,
  Blob:class Blob{},
  URL:{createObjectURL(){return 'blob:test'},revokeObjectURL(){}},
  Image:class Image{},
  document:{createElement(){return {}}},
  setTimeout,
  clearTimeout,
  $:()=>null
};
vm.createContext(previewSandbox);
vm.runInContext(previewSource,previewSandbox,{filename:'preview-engine.js'});
const {hasActiveWordTiming}=previewSandbox.window.ProfitMentePreviewEngine;
const relativeCaption={
  track:3,start:10,duration:4,wordTimingMode:'relative',
  wordTimings:[{word:'Hola',start:0,end:1},{word:'mundo',start:1,end:2}]
};
assert.equal(
  hasActiveWordTiming(relativeCaption,10.5),
  true,
  'the base preview must suppress the full caption while a normalized relative word is active'
);
assert.equal(
  hasActiveWordTiming(relativeCaption,12.5),
  false,
  'the base preview should fall back to the normal caption outside normalized word intervals'
);

console.log('Caption preview timing regression passed');
