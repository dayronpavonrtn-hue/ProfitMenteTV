import assert from 'node:assert/strict';
import fs from 'node:fs';
import './test_caption_split.mjs';
import './test_slip_edit.mjs';

const html=fs.readFileSync(new URL('./index.html',import.meta.url),'utf8');
const bridge=fs.readFileSync(new URL('./transition-duration.js',import.meta.url),'utf8');
const bootstrap=fs.readFileSync(new URL('./feature-bootstrap.js',import.meta.url),'utf8');
const captionTimingIntegration=fs.readFileSync(new URL('./caption-timing-integration.js',import.meta.url),'utf8');

assert.match(html,/transition-duration\.js/,'Studio must load transition duration tools');
assert.match(html,/feature-bootstrap\.js/,'Studio document entrypoint must load the advanced feature bootstrap directly');
const transitionIndex=html.indexOf('transition-duration.js');
const bootstrapIndex=html.indexOf('feature-bootstrap.js');
assert.ok(transitionIndex>=0&&bootstrapIndex>transitionIndex,'feature bootstrap must start after explicitly loaded editor tools');
assert.doesNotMatch(bridge,/feature-bootstrap\.js/,'transition duration must not own global feature startup');
assert.doesNotMatch(bridge,/ensureFeatureBootstrap/,'transition duration must remain independent from bootstrap orchestration');

for(const required of [
  'caption-timing-engine.js',
  'caption-timing-integration.js',
  'media-import-engine.js',
  'media-storage-resilience.js',
  'media-metadata-engine.js',
  'media-library-tools.js',
  'media-library-inspector-rebind.js',
  'media-timeline-dnd.js',
  'project-import-engine.js',
  'project-import-integration.js',
  'project-migration-integration.js',
  'project-autosave.js',
  'recovery-integration.js',
  'export-preflight.js',
  'render-job-integration.js',
  'render-media-pruner.js',
  'track-mixer-integration.js',
  'audio-waveform-engine.js',
  'audio-waveform-integration.js',
  'audio-qc-engine.js',
  'audio-qc-integration.js',
  'slip-edit-engine.js',
  'slip-edit-integration.js',
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
const metadataIndex=bootstrap.indexOf("'media-metadata-engine.js'");
const libraryToolsIndex=bootstrap.indexOf("'media-library-tools.js'");
const inspectorRebindIndex=bootstrap.indexOf("'media-library-inspector-rebind.js'");
assert.ok(metadataIndex>=0,'media metadata runtime must be activated');
assert.ok(libraryToolsIndex>=0&&inspectorRebindIndex>libraryToolsIndex,'media inspector rebind must load after media library tools');
const waveformEngineIndex=bootstrap.indexOf("'audio-waveform-engine.js'");
const waveformIntegrationIndex=bootstrap.indexOf("'audio-waveform-integration.js'");
const audioQcEngineIndex=bootstrap.indexOf("'audio-qc-engine.js'");
const audioQcIntegrationIndex=bootstrap.indexOf("'audio-qc-integration.js'");
assert.ok(waveformEngineIndex>=0&&waveformIntegrationIndex>waveformEngineIndex,'audio waveform integration must load after its engine');
assert.ok(audioQcEngineIndex>waveformIntegrationIndex&&audioQcIntegrationIndex>audioQcEngineIndex,'audio QC must load after waveform runtime');
const renderJobIndex=bootstrap.indexOf("'render-job-integration.js'");
const renderPrunerIndex=bootstrap.indexOf("'render-media-pruner.js'");
assert.ok(renderJobIndex>=0&&renderPrunerIndex>renderJobIndex,'render media pruner must activate after render job integration');
const slipEngineIndex=bootstrap.indexOf("'slip-edit-engine.js'");
const slipIntegrationIndex=bootstrap.indexOf("'slip-edit-integration.js'");
assert.ok(slipEngineIndex>=0&&slipIntegrationIndex>slipEngineIndex,'slip edit engine must load before its integration');
assert.match(bootstrap,/document\.scripts/,'feature bootstrap must skip modules already loaded explicitly');
assert.match(bootstrap,/profitmente:features-ready/,'feature bootstrap must announce startup completion');

console.log('Advanced feature bootstrap wiring OK');