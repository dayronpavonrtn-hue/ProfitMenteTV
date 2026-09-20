import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('../project-import-integration.js', import.meta.url), 'utf8');

// Structural regression for the active JSON import path. Parsed input must be
// normalized/migrated before replacing the live project, persisted before UI
// refresh, and rolled back if any post-apply step fails.
assert.match(source, /const parsed=JSON\.parse\(await f\.text\(\)\)/, 'import must parse project JSON');
assert.match(source, /project=migrateImported\(engine\.normalize\(parsed\)\)/, 'import must normalize and migrate before applying');
assert.match(source, /fallbackApplied=true;\s*if\(typeof originalPersist===['"]function['"]\)originalPersist\(\);else if\(typeof persist===['"]function['"]\)persist\(\)/, 'normalized project must be persisted immediately after apply');
assert.match(source, /if\(fallbackApplied\)await rollbackJsonOpen\(previousProject,previousPlayhead\)/, 'failed applied import must roll back project state');
assert.match(source, /async function rollbackJsonOpen\(previousProject,previousPlayhead\)[\s\S]*project=previousProject;[\s\S]*originalPersist\(\)/, 'rollback must restore and persist the previous project');
assert.match(source, /rollbackJsonOpen[\s\S]*drawTimeline\(\)[\s\S]*drawLibrary\(\)[\s\S]*syncForm\(\)[\s\S]*renderAt/, 'rollback must restore editor UI and preview');

// Syntax/load regression in a minimal browser-like context. Keep this test
// network-free and independent of paid services.
const document = {
  querySelector: () => null,
  readyState: 'complete'
};
const window = {
  document,
  addEventListener: () => {},
  ProfitMenteProjectImportEngine: class {}
};
vm.runInNewContext(source, {
  window, document, console, JSON, Number, String, Object, Array, Math, Date,
  Set, Map, Promise, globalThis: {}, structuredClone: value => value
}, { filename: 'project-import-integration.js' });

console.log('project-import-transaction-regression: ok');
