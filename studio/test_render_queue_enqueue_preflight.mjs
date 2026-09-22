import fs from 'node:fs';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('./render-queue-integration.js', import.meta.url), 'utf8');

assert.match(source, /async function enqueueCurrentValidated\(\)/, 'validated enqueue entrypoint must exist');
assert.match(source, /const gate=await preflight\(\{project:renderProject,assets:renderAssets\}\)/, 'snapshot must be preflighted before enqueue');
assert.match(source, /if\(!gate\?\.ok\)/, 'failed preflight must block enqueue');
assert.match(source, /profitmente:render-queue-rejected/, 'rejected snapshots must emit a UI event');
assert.match(source, /addBtn\.onclick=\(\)=>\{enqueueCurrentValidated\(\)/, 'the visible Add to MP4 queue button must use validated enqueue');
assert.doesNotMatch(source, /addBtn\.onclick=\(\)=>\{try\{enqueueCurrent\(\)/, 'UI must not bypass preflight with raw enqueue');

const validatedStart = source.indexOf('async function enqueueCurrentValidated()');
const validatedEnd = source.indexOf('async function run()', validatedStart);
assert.ok(validatedStart >= 0 && validatedEnd > validatedStart, 'validated enqueue function must be inspectable');
const validatedBody = source.slice(validatedStart, validatedEnd);
assert.ok(validatedBody.indexOf('await preflight') < validatedBody.indexOf('enqueueSnapshot'), 'preflight must run before queue insertion');

console.log('ProfitMente Studio render queue enqueue preflight regression: OK');
