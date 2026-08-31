import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync(new URL('./index.html',import.meta.url),'utf8');
const bridge=fs.readFileSync(new URL('./transition-duration.js',import.meta.url),'utf8');
const bootstrap=fs.readFileSync(new URL('./feature-bootstrap.js',import.meta.url),'utf8');

assert.match(html,/transition-duration\.js/,'Studio must load the bootstrap bridge');
assert.match(bridge,/feature-bootstrap\.js/,'bootstrap bridge must load feature-bootstrap.js');
assert.match(bridge,/s\.async=false/,'bootstrap bridge must preserve deterministic script ordering');
assert.match(bridge,/bootstrapFailed:true/,'bootstrap bridge must expose a visible failure signal');
assert.match(bridge,/document\.scripts/,'bootstrap bridge must avoid duplicate bootstrap injection');

for(const required of [
  'media-library-tools.js',
  'project-migration-integration.js',
  'project-autosave.js',
  'recovery-integration.js',
  'export-preflight.js',
  'render-job-integration.js',
  'track-mixer-integration.js',
  'auto-finish-integration.js'
]) assert.ok(bootstrap.includes(`'${required}'`),`feature bootstrap must include ${required}`);

assert.match(bootstrap,/document\.scripts/,'feature bootstrap must skip modules already loaded explicitly');
assert.match(bootstrap,/profitmente:features-ready/,'feature bootstrap must announce startup completion');

console.log('Advanced feature bootstrap wiring OK');
