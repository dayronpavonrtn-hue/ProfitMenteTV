const assert=require('assert');

class QAEngine{
  inspect(){return {ok:true,issues:[],warnings:[],score:100,metrics:{}}}
}
globalThis.ProfitMenteQAEngine=QAEngine;
const guard=require('../qa-media-identity-guard.js');

const assets=[
  {id:'video-1',name:'clip.mp4',type:'video',duration:10},
  {id:'audio-1',name:'voice.wav',type:'audio',duration:6},
  {id:'image-1',name:'still.jpg',type:'image',duration:5}
];

assert.deepStrictEqual(guard.mediaBoundsIssues({clips:[
  {asset:'video-1',name:'valid',duration:4,sourceOffset:2,speed:2}
]},assets),[],'source end exactly at media duration must be accepted');

let issues=guard.mediaBoundsIssues({clips:[
  {asset:'video-1',name:'too long',duration:4.01,sourceOffset:2,speed:2}
]},assets);
assert.strictEqual(issues.length,1,'video clip extending beyond source must fail');
assert.match(issues[0],/excede la duración del medio fuente/);

issues=guard.mediaBoundsIssues({clips:[
  {asset:'audio-1',name:'audio trim',duration:4,sourceOffset:3}
]},assets);
assert.strictEqual(issues.length,1,'audio sourceOffset plus timeline duration must stay within source');

assert.deepStrictEqual(guard.mediaBoundsIssues({clips:[
  {asset:'image-1',name:'still',duration:30,sourceOffset:20,speed:4}
]},assets),[],'still images are intentionally repeatable and must not use source duration bounds');

const qa=new QAEngine();
const report=qa.inspect({duration:20,clips:[
  {asset:'video-1',name:'render blocker',start:0,duration:6,sourceOffset:5,speed:1}
]},assets);
assert.strictEqual(report.ok,false,'source overflow must block QA/render');
assert.strictEqual(report.metrics.sourceBoundsErrors,1);
assert.ok(report.score<100);

console.log('qa-source-bounds-regression: ok');
