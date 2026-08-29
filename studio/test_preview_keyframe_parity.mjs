import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const code=fs.readFileSync(new URL('./preview-engine.js',import.meta.url),'utf8');
const context={
  console,
  Map,
  Math,
  Number,
  Promise,
  setTimeout,
  clearTimeout,
  URL:{revokeObjectURL(){},createObjectURL(){return 'blob:test'}},
  window:{},
  canvas:{width:1080,height:1920},
  assets:[],
  project:{clips:[],trackState:{}},
  renderAt:null,
  Image:function(){},
  document:{createElement(){return {} }},
  $(){return {hidden:false}}
};
vm.createContext(context);
vm.runInContext(code,context,{filename:'preview-engine.js'});
const engine=context.window.ProfitMentePreviewEngine;
assert.ok(engine?.transformFor,'transformFor should be exposed');

const clip={
  start:0,
  duration:2,
  motion:'slow-zoom',
  transition:'cut',
  positionX:0,
  positionY:0,
  scale:1,
  rotation:0,
  opacity:1,
  keyframes:{
    start:{positionX:-20,positionY:-10,scale:1,rotation:-10,opacity:.2},
    end:{positionX:20,positionY:10,scale:2,rotation:10,opacity:1}
  }
};
const mid=engine.transformFor(clip,1);
assert.ok(Math.abs(mid.scale-1.5)<1e-9,`keyframed scale should be 1.5 without canned motion stacking, got ${mid.scale}`);
assert.ok(Math.abs(mid.alpha-.6)<1e-9,`keyframed opacity should interpolate to .6, got ${mid.alpha}`);
assert.ok(Math.abs(mid.x-0)<1e-9,`midpoint X should cross center, got ${mid.x}`);
assert.ok(Math.abs(mid.y-0)<1e-9,`midpoint Y should cross center, got ${mid.y}`);
assert.ok(Math.abs(mid.rotation)<1e-9,`midpoint rotation should cross 0, got ${mid.rotation}`);

const presetOnly={start:0,duration:2,motion:'slow-zoom',transition:'cut',scale:1,opacity:1};
const presetMid=engine.transformFor(presetOnly,1);
assert.ok(presetMid.scale>1,'motion preset should still animate when explicit keyframes are absent');

console.log('Preview keyframe parity OK');
