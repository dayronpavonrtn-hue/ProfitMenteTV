import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),E=require('./frame-grid-engine.js');
assert.equal(E.normalizeFps(25),30);
assert.ok(Math.abs(E.snapTime(.1,24)-2/24)<1e-8);
assert.equal(E.snapTime(.101,30),.1);
assert.ok(Math.abs(E.snapTime(.019,60)-1/60)<1e-8);
assert.ok(Math.abs(E.snapTime(.099,30,'floor')-2/30)<1e-8);
assert.equal(E.snapTime(.067,30,'ceil'),.1);
assert.equal(E.isAligned(10/24,24),true);
assert.equal(E.isAligned(.1,24),false);
const project={fps:24,duration:10,trackState:{1:{locked:true}},clips:[
 {id:'a',track:0,start:.101,duration:1.099,sourceOffset:2.5,wordTimings:[{start:.111,end:.377,duration:.266}]},
 {id:'locked',track:1,start:.107,duration:1.013}
],markers:[{time:.503}],workRange:{start:.106,end:4.903}};
const before=E.audit(project,{skipLocked:true});assert.ok(before.total>=5);assert.equal(before.skippedLocked,1);
const out=E.conformProject(project,{skipLocked:true});assert.ok(out.changed>=5);assert.equal(out.skippedLocked,1);assert.equal(project.clips[0].sourceOffset,2.5);assert.equal(project.clips[1].start,.107);
assert.equal(E.isAligned(project.clips[0].start,24),true);assert.equal(E.isAligned(project.clips[0].start+project.clips[0].duration,24),true);assert.equal(E.isAligned(project.clips[0].wordTimings[0].start,24),true);assert.equal(E.isAligned(project.clips[0].wordTimings[0].end,24),true);assert.equal(E.isAligned(project.markers[0].time,24),true);assert.equal(E.isAligned(project.workRange.start,24),true);assert.equal(E.isAligned(project.workRange.end,24),true);assert.equal(E.audit(project,{skipLocked:true}).total,0);
const integration=fs.readFileSync(new URL('./frame-grid-integration.js',import.meta.url),'utf8');
assert.match(integration,/playhead.*step/);assert.match(integration,/conformProject/);assert.match(integration,/skipLocked:true/);assert.match(integration,/profitmente:project-opened/);assert.match(integration,/refreshSoon/);
const bootstrap=fs.readFileSync(new URL('./feature-bootstrap.js',import.meta.url),'utf8');
assert.match(bootstrap,/frame-grid-engine\.js/);assert.match(bootstrap,/frame-grid-integration\.js/);
console.log('frame-grid regression: ok');
