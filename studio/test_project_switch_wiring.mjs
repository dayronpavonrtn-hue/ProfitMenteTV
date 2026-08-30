import assert from 'node:assert/strict';
import fs from 'node:fs';

const src=fs.readFileSync(new URL('./project-library.js',import.meta.url),'utf8');

assert.match(src,/function stopPlayback\(\)/,'project switch must define a playback shutdown path');
assert.match(src,/playing=false/,'project switch must clear the playing flag');
assert.match(src,/audio\?\.stop/,'project switch must stop scheduled audio');
assert.match(src,/cancelAnimationFrame\(playTimer\)/,'project switch must cancel the preview animation frame');
assert.match(src,/playBtn\.textContent='▶ Preview'/,'project switch must restore the transport label');

assert.match(src,/function flushCurrentProject\(\)/,'project switch must define a flush path for pending form edits');
assert.match(src,/project\.name=name\.value\|\|'Nuevo video'/,'project switch must capture the current project name before leaving');
assert.match(src,/project\.duration=Math\.max\(1,\+duration\.value\|\|45\)/,'project switch must capture the current project duration before leaving');
assert.match(src,/project\.format=format\.value/,'project switch must capture the current project format before leaving');
assert.match(src,/project\.mode=mode\.value/,'project switch must capture the current editor mode before leaving');
assert.match(src,/if\(typeof persist==='function'\)persist\(\)/,'project switch flush must persist through the wrapped autosave path');
assert.match(src,/catch\(err\).*?return false/s,'project switch must fail closed when the current project cannot be flushed');
assert.match(src,/async function openProject\(id\).*?stopPlayback\(\);if\(!flushCurrentProject\(\)\)return;project=next;await syncAll\(\);resetHistory\(\)/s,'pending edits must flush before replacing and rendering the project');

assert.match(src,/profitmente:project-opened/,'project switch must publish a project-opened event for dependent tools');
assert.match(src,/async function syncAll\(\).*?await renderAt\(0\)/s,'project switch must wait for the first preview frame before reporting completion');

console.log('Safe project switch wiring OK');
