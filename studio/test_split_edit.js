const assert=require('assert');
const Engine=require('./split-edit-engine.js');

function approx(actual,expected,eps=1e-9){assert(Math.abs(actual-expected)<=eps,`${actual} != ${expected}`)}

{
  const clip={id:'a',track:0,name:'Video',start:10,duration:8,sourceOffset:4,speed:2,asset:'v1'};
  const r=Engine.split(clip,13,{idFactory:()=> 'b'});
  assert(r.ok);assert.equal(r.left.id,'a');assert.equal(r.right.id,'b');approx(r.left.duration,3);approx(r.right.start,13);approx(r.right.duration,5);approx(r.right.sourceOffset,10);approx(r.sourceCut,10);assert.equal(r.right.speed,2);
}

{
  const clip={id:'slow',track:0,name:'Slow',start:0,duration:10,sourceOffset:5,speed:.5};
  const r=Engine.split(clip,4,{idFactory:()=> 'slow-r'});
  assert(r.ok);approx(r.right.sourceOffset,7);approx(r.right.duration,6);
}

{
  const clip={id:'kf',track:0,name:'Motion',start:0,duration:10,keyframes:{start:{positionX:-20,scale:1,opacity:0},end:{positionX:20,scale:2,opacity:1}}};
  const r=Engine.split(clip,2.5,{idFactory:()=> 'kf-r'});
  assert(r.ok);approx(r.left.keyframes.end.positionX,-10);approx(r.left.keyframes.end.scale,1.25);approx(r.right.keyframes.start.opacity,.25);assert.deepEqual(r.left.keyframes.end,r.right.keyframes.start);
}

{
  const clip={id:'audio',track:6,name:'Voz',start:0,duration:6,sourceOffset:1,fadeIn:.4,fadeOut:.6};
  const r=Engine.split(clip,3,{idFactory:()=> 'audio-r'});
  assert(r.ok);assert.equal(r.left.fadeIn,.4);assert.equal(r.left.fadeOut,0);assert.equal(r.right.fadeIn,0);assert.equal(r.right.fadeOut,.6);
}

{
  const clip={id:'edge',track:0,name:'Edge',start:2,duration:4};
  assert.equal(Engine.split(clip,2.01).ok,false);assert.equal(Engine.split(clip,5.99).ok,false);assert.equal(Engine.split(clip,4,{idFactory:()=> 'ok'}).ok,true);
}

{
  const clip={id:'clamp',track:0,name:'Clamp',start:0,duration:4,sourceOffset:2,speed:99};
  const r=Engine.split(clip,1,{idFactory:()=> 'clamp-r'});
  assert(r.ok);assert.equal(r.speed,4);approx(r.right.sourceOffset,6);
}

console.log('split edit regression: ok');
