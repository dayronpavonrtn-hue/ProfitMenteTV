import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source=fs.readFileSync(new URL('./recovery-integration.js',import.meta.url),'utf8');

assert.match(source,/ProfitMenteNewProject\?\.flushCurrentProject/,'restore must flush the current project before switching to a recovery snapshot');
assert.match(source,/if\(!flushBeforeRestore\(\)\)/,'restore must abort when the current project cannot be saved safely');
assert.match(source,/if\(typeof persist==='function'\)persist\(\);else if\(typeof originalPersist==='function'\)originalPersist\(\)/,'restored snapshots must use the full persistence chain so saved projects are updated immediately');
assert.match(source,/lib\?\.load&&lib\.load\(next\.libraryId\)/,'restore must verify that a saved project identity still exists');
assert.match(source,/delete copy\.libraryId/,'orphaned recovery snapshots must become drafts instead of keeping a dangling library id');
assert.match(source,/recovered:true/,'recovery must announce the restored project so project-scoped integrations can resync');

new vm.Script(source,{filename:'recovery-integration.js'});
console.log('Recovery restore persistence wiring OK');
