import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source=fs.readFileSync(new URL('./recovery-integration.js',import.meta.url),'utf8');

assert.match(source,/profitmente:project-opened/,'recovery UI must react when another project is opened');
assert.match(source,/showAll=false/,'project switch must leave the global recovery view');
assert.match(source,/function ensureCurrentProjectRecovery\(\)[\s\S]*?capture\('inicio'\)/,'project switch must capture/deduplicate the newly opened project so legacy draft identities can be upgraded');
assert.match(source,/function capture\(reason='change'\)[\s\S]*?engine\.capture\(project,reason\)/,'project switch recovery must remain scoped to the active project');
assert.match(source,/persistRecoveryIdentity/,'new draft recovery identity must be persisted for reload continuity');

new vm.Script(source,{filename:'recovery-integration.js'});
console.log('Recovery project-switch wiring OK');
