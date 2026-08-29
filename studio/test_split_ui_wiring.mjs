import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

const editTools=await fs.readFile(new URL('./edit-tools.js',import.meta.url),'utf8');
const timelineOps=await fs.readFile(new URL('./timeline-operations.js',import.meta.url),'utf8');
const index=await fs.readFile(new URL('./index.html',import.meta.url),'utf8');

assert.match(editTools,/const locked=c=>!!project\.trackState/,'edit-tools must expose a track-lock guard');
assert.match(editTools,/if\(locked\(c\)\)\{status\('La pista está bloqueada'\);return\}/,'split must refuse locked tracks');
assert.match(editTools,/e\.preventDefault\(\);e\.stopImmediatePropagation\(\);split\(\)/,'canonical S shortcut must stop later duplicate handlers');
assert.match(editTools,/if\(index<0\)\{status\('El clip cambió antes de completar el corte'\);return\}/,'async split must abort safely if the clip disappeared');

const editPos=index.indexOf('<script src="edit-tools.js"></script>');
const timelinePos=index.indexOf('<script src="timeline-operations.js"></script>');
assert.ok(editPos>=0&&timelinePos>=0&&editPos<timelinePos,'edit-tools must register its canonical shortcut before timeline-operations');

const legacyShortcuts=[...timelineOps.matchAll(/e\.key\.toLowerCase\(\)==='s'/g)];
assert.equal(legacyShortcuts.length,1,'legacy timeline operations currently has exactly one secondary S handler, which must be blocked by the canonical listener');

const canonicalShortcuts=[...editTools.matchAll(/e\.key\.toLowerCase\(\)==='s'/g)];
assert.equal(canonicalShortcuts.length,1,'edit-tools must remain the canonical S shortcut owner');

console.log('split UI wiring regression: ok');
