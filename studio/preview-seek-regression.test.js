const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, 'preview-engine.js'), 'utf8');

function expect(pattern, message) {
  if (!pattern.test(source)) throw new Error(message);
}

expect(/const frameReady=await seekVideo\(source,sourceTime\);/, 'video preview must wait for the requested decoded frame');
expect(/if\(!frameReady\|\|epoch!==renderEpoch\)return false;/, 'stale or unavailable video frames must never be painted');
expect(/requestVideoFrameCallback/, 'preview seek must use decoded-frame confirmation when the browser provides it');
expect(/seekTimer=setTimeout\(\(\)=>finish\(false\),750\)/, 'slow seeks must fail closed instead of painting an old frame');
if (/setTimeout\(finish,220\)/.test(source)) throw new Error('legacy seek timeout can resolve before the requested frame is decoded');

console.log('Preview seek regression QA passed: stale video frames are rejected.');
