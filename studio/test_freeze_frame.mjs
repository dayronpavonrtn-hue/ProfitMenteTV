import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
const require=createRequire(import.meta.url);
const Engine=require('./freeze-frame-engine.js');
const e=new Engine();

{
  const clip={start:5,duration:10,speed:1,sourceOffset:3};
  const asset={type:'video',duration:40};
  const r=e.sourceTimeAt(clip,9,asset);
  assert.equal(r.ok,true);assert.equal(r.local,4);assert.equal(r.time,7);
}
{
  const clip={start:2,duration:8,speed:2,sourceOffset:4};
  const asset={type:'video',duration:30};
  assert.equal(e.sourceTimeAt(clip,5,asset).time,10);
}
{
  const clip={start:0,duration:20,speed:1,sourceOffset:0};
  const asset={type:'video',duration:6};
  const r=e.sourceTimeAt(clip,12,asset);
  assert.ok(Math.abs(r.time-5.99)<1e-9,'must clamp before the physical end of source');
}
{
  const clip={start:0,duration:4,speed:1,sourceOffset:0};
  assert.equal(e.sourceTimeAt(clip,1,{type:'image',duration:10}).ok,false);
}
{
  const clip={start:0,duration:4,speed:1,sourceOffset:2};
  const asset={type:'video',duration:20};
  const r=e.set(clip,1.5,asset);assert.equal(r.changed,true);assert.equal(clip.freezeFrameSource,3.5);assert.equal(e.frozen(clip),true);
  const again=e.set(clip,1.5,asset);assert.equal(again.changed,false);
  const cleared=e.clear(clip);assert.equal(cleared.changed,true);assert.equal(e.frozen(clip),false);
}
{
  const clip={freezeFrameSource:99};const r=e.normalize(clip,{type:'video',duration:8});
  assert.equal(r.changed,true);assert.ok(Math.abs(clip.freezeFrameSource-7.99)<1e-9);
}

const integration=readFileSync(new URL('./freeze-frame-integration.js',import.meta.url),'utf8');
assert.match(integration,/canvas\.toBlob/,'freeze frame must materialize a local image');
assert.match(integration,/generatedBy:'freeze-frame'/,'generated asset must be identifiable');
assert.match(integration,/await putAsset\(asset\)/,'generated frame must enter the project asset store');
assert.match(integration,/c\.asset=freezeAsset\.id/,'clip must use the generated image so existing preview/render paths stay in parity');
assert.match(integration,/c\.asset=original/,'clear must restore the original video source');

const bootstrap=readFileSync(new URL('./feature-bootstrap.js',import.meta.url),'utf8');
assert.match(bootstrap,/freeze-frame-engine\.js/);assert.match(bootstrap,/freeze-frame-integration\.js/);
console.log('Freeze Frame regression: OK');
