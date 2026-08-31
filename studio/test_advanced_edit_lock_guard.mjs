import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {ProfitMenteEditLockGuard}=require('./edit-lock-guard.js');
const {ProfitMenteFrameNudgeEngine}=require('./frame-nudge-engine.js');

const base={trackState:{0:{locked:false},'1':{locked:true}}};
assert.equal(ProfitMenteEditLockGuard.isLocked(base,{track:0,locked:true}),true,'individual clip lock must win');
assert.equal(ProfitMenteEditLockGuard.isLocked(base,{track:1}),true,'string-keyed track lock must be honored');
assert.equal(ProfitMenteEditLockGuard.isLocked(base,{track:0}),false,'editable clip must remain editable');
assert.equal(ProfitMenteEditLockGuard.anyLocked(base,[{track:0},{track:0,locked:true}]),true);

const project={fps:30,duration:10,trackState:{0:{locked:false}},clips:[
  {id:'a',track:0,start:1,duration:2,groupId:'g'},
  {id:'b',track:0,start:4,duration:2,groupId:'g',locked:true}
]};
const before=project.clips.map(c=>c.start);
const blocked=ProfitMenteFrameNudgeEngine.apply(project,'a',1);
assert.equal(blocked.ok,false);
assert.equal(blocked.reason,'locked');
assert.deepEqual(project.clips.map(c=>c.start),before,'a locked member must protect the whole group');
project.clips[1].locked=false;
const moved=ProfitMenteFrameNudgeEngine.apply(project,'a',1);
assert.equal(moved.ok,true);
assert.equal(moved.changed,2);
assert.ok(project.clips[0].start>before[0]&&project.clips[1].start>before[1]);

for(const file of ['slip-edit-integration.js','roll-edit-integration.js','rate-stretch-integration.js','freeze-frame-integration.js']){
  const src=fs.readFileSync(new URL(file,import.meta.url),'utf8');
  assert.match(src,/ProfitMenteEditLockGuard/ ,`${file} must use the shared lock guard`);
  assert.match(src,/locked\(c\)|locked\(p\.left\)/,`${file} must gate mutation paths`);
}
const bootstrap=fs.readFileSync(new URL('feature-bootstrap.js',import.meta.url),'utf8');
const guardAt=bootstrap.indexOf("['edit-lock-guard.js'");
const slipAt=bootstrap.indexOf("['slip-edit-engine.js'");
assert.ok(guardAt>=0&&slipAt>guardAt,'lock guard must load before advanced edit integrations');
console.log('Advanced edit lock guard regression: OK');
