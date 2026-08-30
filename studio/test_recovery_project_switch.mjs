import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source=fs.readFileSync(new URL('./recovery-integration.js',import.meta.url),'utf8');

assert.match(source,/profitmente:project-opened/,'recovery UI must react when another project is opened');
assert.match(source,/showAll=false/,'project switch must leave the global recovery view');
assert.match(source,/engine\.latest\(project\)/,'project switch must scope recovery to the newly opened project');
assert.match(source,/capture\('inicio'\)/,'a project without snapshots must receive an initial recovery point');

new vm.Script(source,{filename:'recovery-integration.js'});
console.log('Recovery project-switch wiring OK');
