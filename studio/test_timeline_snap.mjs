import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import fs from 'node:fs';
const require=createRequire(import.meta.url);
const {ProfitMenteTimelineSnapEngine:E}=require('./timeline-snap-engine.js');
const project={duration:20,clips:[
  {id:'a',track:0,start:0,duration:4},
  {id:'b',track:0,start:7,duration:3},
  {id:'c',track:1,start:12,duration:2}
]};
let r=E.move(project,project.clips[1],4.08,{tolerance:.1});
assert.equal(r.snapped,true);assert.equal(r.value,4);assert.equal(r.target,4);
r=E.move(project,project.clips[1],8.92,{tolerance:.1});
assert.equal(r.snapped,true);assert.equal(r.value,9);assert.equal(r.target,12,'clip end should snap to another cut');
r=E.move(project,project.clips[1],5.06,{playhead:5,tolerance:.1});
assert.equal(r.snapped,true);assert.equal(r.value,5);assert.equal(r.target,5,'playhead should be a snap target');
r=E.move(project,project.clips[1],5.2,{playhead:5,tolerance:.1});
assert.equal(r.snapped,false);assert.equal(r.value,5.2,'outside tolerance must stay free');
r=E.trim(project,project.clips[0],6.94,{tolerance:.1});
assert.equal(r.snapped,true);assert.equal(r.value,7);assert.equal(r.target,7,'trim end should snap to next cut');
r=E.trim(project,{id:'x',start:19.8,duration:.2},2,{tolerance:.2,minDuration:.25});
assert.ok(r.value>=.2&&r.value<=.25,'trim should remain inside project boundary');
const points=E.points(project,'a',10.05);assert.ok(points.includes(0)&&points.includes(20)&&points.includes(10.05));

assert.equal(E.sameId(7,'007'),true);assert.equal(E.sameId('7.0','+07.000'),true);assert.equal(E.sameId('A','a'),false);
const legacy={duration:20,clips:[
  {id:7,track:0,start:5,duration:3},
  {id:'other',track:0,start:12,duration:2}
]};
const legacyPoints=E.points(legacy,'007');
assert.equal(legacyPoints.includes(5),false,'numeric alias must exclude the moving clip start');
assert.equal(legacyPoints.includes(8),false,'numeric alias must exclude the moving clip end');
assert.equal(legacyPoints.includes(12),true);
r=E.move(legacy,{id:'007',duration:3},5.04,{tolerance:.1});
assert.equal(r.snapped,false,'moving clip must not magnetically snap to its own aliased boundary');

const bootstrap=fs.readFileSync(new URL('./feature-bootstrap.js',import.meta.url),'utf8');
assert.match(bootstrap,/timeline-snap-engine\.js/);assert.match(bootstrap,/timeline-snap-integration\.js/);
const integration=fs.readFileSync(new URL('./timeline-snap-integration.js',import.meta.url),'utf8');
assert.match(integration,/e\.altKey/,'Alt must bypass magnetic snapping');
console.log('timeline snap regression: ok');
