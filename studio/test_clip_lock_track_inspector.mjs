import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {ProfitMenteClipLockEngine}=require('./clip-lock-engine.js');

const engine=new ProfitMenteClipLockEngine();
const project={trackState:{0:{locked:true},1:{locked:false}},clips:[
  {id:'track-locked',track:0,locked:false},
  {id:'clip-locked',track:1,locked:true},
  {id:'editable',track:1,locked:false}
]};

assert.equal(engine.isLocked(project,project.clips[0]),true,'track lock must protect a selected clip');
assert.equal(engine.isLocked(project,project.clips[1]),true,'individual clip lock must still protect a selected clip');
assert.equal(engine.isLocked(project,project.clips[2]),false,'unlocked clip on unlocked track must remain editable');

const lockSrc=fs.readFileSync(new URL('clip-lock-integration.js',import.meta.url),'utf8');
assert.match(lockSrc,/locked=engine\.isLocked\(project,clip\)/,'inspector state must include track locks');
assert.match(lockSrc,/if\(locked\)\{if\(!el\.disabled\)/,'inspector controls must disable for either lock source');
assert.ok((lockSrc.match(/engine\.isLocked\(project,clip\)/g)||[]).length>=5,'pointer, double-click, button, keyboard and inspector paths must use the combined lock guard');
assert.match(lockSrc,/isLocked:clip=>engine\.isLocked\(project,clip\)/,'public lock API must expose combined lock state');

const inspectorSrc=fs.readFileSync(new URL('clip-inspector.js',import.meta.url),'utf8');
assert.match(inspectorSrc,/function canonicalId\(value\)/,'clip inspector must canonicalize clip/media identity');
assert.match(inspectorSrc,/const byId=id=>\(project\?\.clips\|\|\[\]\)\.find\(c=>idsEqual\(c\?\.id,id\)\)/,'selected clip lookup must use canonical identity');
assert.match(inspectorSrc,/const assetFor=c=>\{const key=canonicalId\(c\?\.asset\)/,'asset lookup must support valid asset id 0');
assert.doesNotMatch(inspectorSrc,/c\.asset&&assets\.find\(x=>x\.id===c\.asset\)/,'legacy truthy/strict asset lookup must not return');
assert.doesNotMatch(inspectorSrc,/!c\.asset/,'asset id 0 must not be treated as missing');
assert.match(inspectorSrc,/function canonicalTrack\(value\)/,'inspector must normalize legacy track aliases');
assert.match(inspectorSrc,/Number\.isInteger\(n\)&&n>=0&&n<=6/,'only canonical Studio tracks 0-6 may be classified');
assert.match(inspectorSrc,/function mutableSelected\(\)/,'all direct inspector mutations need a lock-aware selected clip');
assert.ok((inspectorSrc.match(/mutableSelected\(\)/g)||[]).length>=6,'commit, keyframes, reset and fit operations must share the lock-aware mutation path');
assert.match(inspectorSrc,/window\.ProfitMenteClipLock\?\.isLocked/,'inspector must reuse the public combined clip/track lock guard when available');
assert.match(inspectorSrc,/project\?\.trackState,project\?\.trackStates/,'fallback lock guard must honor modern and legacy track state containers');
assert.match(inspectorSrc,/canonicalId\(selected\(\)\)!==renderedId/,'inspector selection polling must compare canonical ids');

console.log('Clip lock + inspector identity regression: OK');
