import assert from 'node:assert/strict';
import fs from 'node:fs';

const src=fs.readFileSync(new URL('./project-library.js',import.meta.url),'utf8');

assert.match(src,/function stopPlayback\(\)/,'project switch must define a playback shutdown path');
assert.match(src,/playing=false/,'project switch must clear the playing flag');
assert.match(src,/audio\?\.stop/,'project switch must stop scheduled audio');
assert.match(src,/cancelAnimationFrame\(playTimer\)/,'project switch must cancel the preview animation frame');
assert.match(src,/playBtn\.textContent='▶ Preview'/,'project switch must restore the transport label');
assert.match(src,/async function openProject\(id\).*?stopPlayback\(\);project=next;await syncAll\(\);resetHistory\(\)/s,'playback must stop before replacing and rendering the project');
assert.match(src,/profitmente:project-opened/,'project switch must publish a project-opened event for dependent tools');
assert.match(src,/async function syncAll\(\).*?await renderAt\(0\)/s,'project switch must wait for the first preview frame before reporting completion');

console.log('Safe project switch wiring OK');
