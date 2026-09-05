import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const source=fs.readFileSync(path.join(here,'project-library.js'),'utf8');
const match=source.match(/async function openProject\(id\)\{([\s\S]*?)\}\n  async function duplicateProject/);
assert.ok(match,'openProject controller must exist');
const body=match[1];
const flushIndex=body.indexOf('flushCurrentProject()');
const loadIndex=body.indexOf('lib.load(id)');
assert.ok(flushIndex>=0,'openProject must flush pending edits');
assert.ok(loadIndex>=0,'openProject must load the requested project');
assert.ok(flushIndex<loadIndex,'openProject must flush pending edits before loading the requested project, including reopening the active project');
assert.match(body,/if\(!next\)\{status\('No se pudo abrir el proyecto'\);return\}/,'openProject must report a missing target after the safe flush');

console.log('project reopen flush ordering regression passed');
