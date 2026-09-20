import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('../project-import-integration.js', import.meta.url), 'utf8');

// Structural regression: imported projects must be normalized before the live
// project is replaced, and persistence must happen before render/refresh.
assert.match(source, /normalizeImportedProject\(parsed\)/, 'import must normalize parsed JSON');
assert.match(source, /window\.project\s*=\s*normalized/, 'live project must only receive normalized data');
assert.match(source, /persistImportedProject\(normalized\)/, 'normalized project must be persisted');
assert.match(source, /window\.project\s*=\s*previousProject/, 'failed import must roll back live project');
assert.match(source, /localStorage\.setItem\(key,\s*previousStored\)/, 'failed import must restore prior persisted project');

// Syntax regression in a browser-like context. The integration is an IIFE and
// should load without requiring paid/network services.
const document = { getElementById: () => null };
const window = { document };
vm.runInNewContext(source, { window, document, console, JSON, Number, String, Object, Array, Math, Date, Set, Map, Promise }, { filename: 'project-import-integration.js' });

console.log('project-import-transaction-regression: ok');
