import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {ProfitMenteRateStretchEngine}=require('./rate-stretch-engine.js');
const e=new ProfitMenteRateStretchEngine();

{
  const clip={id:'a',asset:'v1',track:1,start:2,duration:10,speed:1,sourceOffset:5};
  const asset={id:'v1',type:'video',duration:30};
  const r=e.stretch(clip,asset,5,null,60);
  assert.equal(r.ok,true);assert.equal(r.changed,true);assert.equal(clip.duration,5);assert.equal(clip.speed,2);assert.equal(r.preservedSource,true);assert.equal(r.sourceSpanAfter,10);
}
{
  const clip={id:'a',asset:'v1',track:1,start:0,duration:8,speed:1.5,sourceOffset:3};
  const asset={id:'v1',type:'video',duration:50};
  const r=e.stretch(clip,asset,12,null,60);
  assert.equal(clip.duration,12);assert.equal(clip.speed,1);assert.equal(r.sourceSpan,12);assert.equal(r.sourceSpanAfter,12);
}
{
  const clip={id:'a',asset:'v1',track:1,start:4,duration:4,speed:1,sourceOffset:0};
  const next={id:'b',asset:'v2',track:1,start:10,duration:3,speed:1};
  const asset={id:'v1',type:'video',duration:20};
  const r=e.stretch(clip,asset,9,next,30);
  assert.equal(r.clamped,true);assert.equal(clip.duration,6);assert.ok(Math.abs(clip.speed-(4/6))<1e-6);assert.equal(r.preservedSource,true);
}
{
  const clip={id:'a',asset:'v1',track:1,start:0,duration:8,speed:1,sourceOffset:0};
  const asset={id:'v1',type:'video',duration:20};
  const fast=e.stretch(clip,asset,.1,null,60);
  assert.equal(fast.clamped,true);assert.equal(clip.duration,2);assert.equal(clip.speed,4);
}
{
  const clip={id:'a',asset:'v1',track:1,start:0,duration:4,speed:1,sourceOffset:0};
  const asset={id:'v1',type:'video',duration:20};
  const slow=e.stretch(clip,asset,100,null,60);
  assert.equal(slow.clamped,true);assert.equal(clip.duration,16);assert.equal(clip.speed,.25);
}
{
  const clip={id:'a',asset:'v1',track:2,start:0,duration:6,speed:2,sourceOffset:10};
  const asset={id:'v1',type:'video',duration:20};
  const b=e.targetBounds(clip,asset,null,60);
  assert.equal(b.ok,false);assert.equal(b.reason,'source-out-of-bounds');
}
{
  const clips=[{id:'a',track:1,start:1,duration:2},{id:'x',track:2,start:3,duration:2},{id:'b',track:1,start:5,duration:2},{id:'c',track:1,start:9,duration:2}];
  assert.equal(e.nextOnTrack(clips,clips[0]).id,'b');
}
console.log('Rate Stretch regression: OK');
