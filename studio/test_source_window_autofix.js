const assert=require('assert');
const Autofix=require('./qa-autofix.js');

const project={duration:20,clips:[
  {id:'video',track:0,asset:'a',start:2,duration:8,speed:2,sourceOffset:1,wordTimings:[{word:'keep',start:2,end:4,index:0},{word:'crop',start:6,end:9,index:1},{word:'drop',start:10,end:11,index:2}]},
  {id:'locked',track:0,asset:'b',start:0,duration:9,speed:2,sourceOffset:0,locked:true}
]};
const assets=[{id:'a',type:'video',duration:10},{id:'b',type:'video',duration:10}];
const result=Autofix.repair(project,assets);
const clip=project.clips[0];
assert(Math.abs(clip.duration-4.5)<1e-9,'QA repair must cap timeline duration to available source');
assert(Math.abs(clip.sourceOffset-1)<1e-9);
assert(Math.abs(clip.sourceOffset+clip.duration*clip.speed-10)<1e-9,'repaired source window must end at or before media EOF');
assert.deepStrictEqual(clip.wordTimings.map(w=>w.word),['keep','crop'],'word timings outside shortened clip must be removed');
assert(Math.abs(clip.wordTimings[1].end-6.5)<1e-9,'crossing word timing must be clipped to new timeline end');
assert.strictEqual(project.clips[1].duration,9,'locked clip must remain untouched');
assert.strictEqual(result.skippedLocked,1);
assert(result.changed>0);
console.log('Source window QA autofix regression: OK');
