const assert=require('assert');
const {ProfitMenteVisualKeyframeEngine}=require('./visual-keyframe-engine.js');
global.ProfitMenteVisualKeyframeEngine=ProfitMenteVisualKeyframeEngine;
const {ProfitMenteVisualKeyframeRenderBaker}=require('./visual-keyframe-render-baker.js');
const baker=new ProfitMenteVisualKeyframeRenderBaker({samplesPerSecond:4,maxSamplesPerSpan:8});
const clip={id:'v1',track:0,asset:'a1',start:10,duration:4,sourceOffset:2,speed:2,transition:'fade',transitionDuration:.3,visualKeyframes:[
  {time:0,x:0,y:0,scale:1,rotation:0,opacity:1,easing:'ease-in'},
  {time:2,x:100,y:-50,scale:2,rotation:90,opacity:.5,easing:'hold'},
  {time:3,x:-100,y:20,scale:.5,rotation:-45,opacity:.8,easing:'linear'},
  {time:4,x:0,y:0,scale:1,rotation:0,opacity:1,easing:'linear'}
]};
const original=JSON.stringify(clip),parts=baker.bakeClip({},clip);
assert(parts.length>4,'nonlinear easing should be sampled into render-safe segments');
assert.strictEqual(JSON.stringify(clip),original,'baking must not mutate editable project clips');
assert.strictEqual(parts[0].start,10);assert.strictEqual(parts[0].sourceOffset,2);assert.strictEqual(parts[0].transition,'fade');
for(let i=1;i<parts.length;i++)assert.strictEqual(parts[i].transition,'cut');
for(const part of parts){assert(part.duration>0);assert(!('visualKeyframes' in part));assert(part.keyframes?.start&&part.keyframes?.end)}
const hold=parts.filter(p=>p.start>=12-1e-9&&p.start<13-1e-9);
assert.strictEqual(hold.length,1,'hold easing should not create needless samples');
assert.deepStrictEqual(hold[0].keyframes.start,hold[0].keyframes.end,'hold must remain constant until next keyframe');
const afterHold=parts.find(p=>Math.abs(p.start-13)<1e-9);assert(afterHold);assert.strictEqual(afterHold.keyframes.start.positionX,-100);
const sampled=parts.find(p=>p.start>10&&p.start<12);assert(sampled);assert(sampled.keyframes.start.positionX>=0&&sampled.keyframes.end.positionX<=100);
close(parts.at(-1).start+parts.at(-1).duration,14);close(parts.at(-1).sourceOffset+parts.at(-1).duration*2,10);
const baked=baker.bakeProject({name:'x',clips:[clip,{id:'cap',track:3,start:0,duration:4,name:'hola'}]});
assert(baked.renderCompatibility.visualKeyframesBaked);assert(baked.clips.some(c=>c.id==='cap'));assert.strictEqual(JSON.stringify(clip),original);
function close(a,b,eps=1e-8){assert(Math.abs(a-b)<=eps,`${a} != ${b}`)}
console.log('visual keyframe render baker regression: ok');
