import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

const editTools=await fs.readFile(new URL('./edit-tools.js',import.meta.url),'utf8');
const timelineOps=await fs.readFile(new URL('./timeline-operations.js',import.meta.url),'utf8');

assert.match(editTools,/function locked\(c\)/,'edit-tools must expose a track-lock guard');
assert.match(editTools,/if\(locked\(c\)\)\{status\('La pista está bloqueada'\);return\}/,'split must refuse locked tracks');
assert.match(timelineOps,/root\.ProfitMenteEditTools\?\.split\(\)/,'secondary split button must delegate to the canonical split path');

const shortcutBranches=[...timelineOps.matchAll(/e\.key\.toLowerCase\(\)==='s'/g)];
assert.equal(shortcutBranches.length,0,'timeline-operations must not register a second S shortcut');

const canonicalShortcuts=[...editTools.matchAll(/e\.key\.toLowerCase\(\)==='s'/g)];
assert.equal(canonicalShortcuts.length,1,'edit-tools must remain the single S shortcut owner');

console.log('split UI wiring regression: ok');
