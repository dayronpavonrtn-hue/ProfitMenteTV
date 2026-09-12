import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const previewSource=fs.readFileSync(new URL('./caption-preview.js',import.meta.url),'utf8');
const renderSource=fs.readFileSync(new URL('./render_mp4.py',import.meta.url),'utf8');
const context={
  renderAt:async()=>{},
  project:{clips:[]},
  ctx:{},
  canvas:{width:1080,height:1920},
  window:{},
  console,
};
vm.createContext(context);
vm.runInContext(previewSource,context,{filename:'caption-preview.js'});
const scale=context.window.ProfitMenteCaptionPreview?.wordPopScale;
assert.equal(typeof scale,'function','caption preview must expose wordPopScale for parity QA');

const expected=p=>p<=0||p>=1?1:1+0.16*Math.exp(-7*p)*Math.sin(Math.PI*p*2);
for(const p of [0,0.05,0.15,0.25,0.49,0.5,0.65,0.9,1]){
  assert.ok(Math.abs(scale(p)-expected(p))<1e-12,`preview pop differs from renderer curve at ${p}`);
}
assert.ok(scale(0.15)>1,'word pop should expand during the first half');
assert.ok(scale(0.65)<1,'word pop should include the renderer recoil during the second half');
assert.equal(scale(true),1,'invalid boolean progress must not be coerced');
assert.equal(scale({value:0.2}),1,'invalid object progress must not be coerced');
assert.ok(Math.abs(scale('0.25')-expected(0.25))<1e-12,'numeric legacy strings remain supported');

assert.match(
  renderSource,
  /1\+0\.16\*exp\(-7\*\{progress\}\)\*sin\(PI\*\{progress\}\*2\)/,
  'MP4 renderer must keep the same damped full-sine word-pop curve',
);

console.log('Caption pop preview/render parity QA passed');
