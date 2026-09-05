import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {ProfitMenteTimelineRightTrimEngine:Engine}=require('./timeline-right-trim.js');

const snap={
  points(project,excludeId,playhead){return [0,playhead,...project.clips.filter(c=>String(c.id)!==String(excludeId)).flatMap(c=>[c.start,c.start+c.duration])].filter(Number.isFinite)},
  nearest(value,points,tolerance){let target=null,best=Infinity;for(const p of points){const d=Math.abs(p-value);if(d<=tolerance&&d<best){best=d;target=p}}return target===null?{snapped:false,value,target:null}:{snapped:true,value:target,target}}
};

const project={duration:20,clips:[{id:'007',start:2,duration:4},{id:'other',start:10,duration:2}]};
let clip={id:7,start:2,duration:4,sourceOffset:1,speed:2,asset:'v'};
let r=Engine.calculate(project,clip,20,{sourceDuration:9});
assert.equal(r.maxEnd,6,'right trim must stop where source media ends');
assert.equal(r.duration,4,'source window permits only four timeline seconds at 2x');
assert.equal(r.sourceLimited,true);

clip={id:'clip',start:2,duration:2,sourceOffset:1,speed:1};
r=Engine.calculate(project,clip,9.92,{sourceDuration:30,playhead:8,snapEngine:snap,tolerance:.15});
assert.equal(r.end,10,'right trim should snap to neighboring cut');
assert.equal(r.duration,8);
assert.equal(r.snapped,true);

r=Engine.calculate(project,clip,19,{sourceDuration:5});
assert.equal(r.maxEnd,6,'sourceOffset must reduce available source duration');
assert.equal(r.end,6);

r=Engine.calculate(project,{id:'short-tail',start:4,duration:.1,sourceOffset:9.9,speed:1},8,{sourceDuration:10,minDuration:.25});
assert.equal(r.maxEnd,4.1,'short remaining source tail must define the hard trim boundary');
assert.equal(r.minEnd,4.1,'minimum trim duration must yield to a shorter real source tail');
assert.equal(r.end,4.1,'right trim must never extend beyond the available source just to satisfy minimum duration');
assert.equal(r.duration,.1);

r=Engine.calculate(project,{id:'x',start:19.9,duration:.1},20,{minDuration:.25});
assert.equal(r.end,20,'minimum duration must remain valid at project boundary');
assert.ok(r.duration>0);

r=Engine.calculate(project,{id:'x',start:0,duration:1},12,{sourceDuration:0});
assert.equal(r.end,12,'unknown source duration must not falsely clamp legacy media');

console.log('timeline right trim regression: ok');
