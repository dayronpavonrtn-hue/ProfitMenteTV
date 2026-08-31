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

const src=fs.readFileSync(new URL('clip-lock-integration.js',import.meta.url),'utf8');
assert.match(src,/locked=engine\.isLocked\(project,clip\)/,'inspector state must include track locks');
assert.match(src,/if\(locked\)\{if\(!el\.disabled\)/,'inspector controls must disable for either lock source');
assert.ok((src.match(/engine\.isLocked\(project,clip\)/g)||[]).length>=5,'pointer, double-click, button, keyboard and inspector paths must use the combined lock guard');
assert.match(src,/isLocked:clip=>engine\.isLocked\(project,clip\)/,'public lock API must expose combined lock state');

console.log('Clip lock track inspector regression: OK');
