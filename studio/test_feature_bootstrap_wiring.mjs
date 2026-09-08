import assert from 'node:assert/strict';
import fs from 'node:fs';
import './test_caption_split.mjs';

const html=fs.readFileSync(new URL('./index.html',import.meta.url),'utf8');
const bridge=fs.readFileSync(new URL('./transition-duration.js',import.meta.url),'utf8');
const bootstrap=fs.readFileSync(new URL('./feature-bootstrap.js',import.meta.url),'utf8');
const captionTimingIntegration=fs.readFileSync(new URL('./caption-timing-integration.js',import.meta.url),'utf8');

assert.match(html,/transition-duration\.js/,'Studio must load the bootstrap bridge');
assert.match(bridge,/feature-bootstrap\.js/,'bootstrap bridge must load feature-bootstrap.js');
assert.match(bridge,/s\.async=false/,'bootstrap bridge must preserve deterministic script ordering');
assert.match(bridge,/bootstrapFailed:true/,'bootstrap bridge must expose a visible failure signal');
assert.match(bridge,/document\.scripts/,'bootstrap bridge must avoid duplicate bootstrap injection');

for(const required of [
  'caption-timing-engine.js',
  'caption-timing-integration.js',
  'media-library-tools.js',
  'media-storage-resilience.js',
  'project-import-engine.js',
  'project-import-integration.js',
  'project-migration-integration.js',
  'project-autosave.js',
  'recovery-integration.js',
  'export-preflight.js',
  'render-job-integration.js',
  'track-mixer-integration.js',
  'auto-finish-integration.js'
]) assert.ok(bootstrap.includes(`'${required}'`),`feature bootstrap must include ${required}`);

const captionEngineIndex=bootstrap.indexOf("'caption-timing-engine.js'");
const captionIntegrationIndex=bootstrap.indexOf("'caption-timing-integration.js'");
assert.ok(captionEngineIndex>=0&&captionIntegrationIndex>captionEngineIndex,'caption timing engine must load before its integration');
assert.match(captionTimingIntegration,/loadOnce\('caption-split-engine\.js','ProfitMenteCaptionSplitEngine'/,'caption timing integration must load caption split engine');
assert.match(captionTimingIntegration,/loadOnce\('caption-split-integration\.js','ProfitMenteCaptionSplit'/,'caption split integration must load after its engine');
const importEngineIndex=bootstrap.indexOf("'project-import-engine.js'");
const importIntegrationIndex=bootstrap.indexOf("'project-import-integration.js'");
assert.ok(importEngineIndex>=0&&importIntegrationIndex>importEngineIndex,'safe project import engine must load before its integration');
assert.match(bootstrap,/document\.scripts/,'feature bootstrap must skip modules already loaded explicitly');
assert.match(bootstrap,/profitmente:features-ready/,'feature bootstrap must announce startup completion');

console.log('Advanced feature bootstrap wiring OK');