import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source=fs.readFileSync(new URL('./recovery-integration.js',import.meta.url),'utf8');

assert.match(source,/ProfitMenteNewProject\?\.flushCurrentProject/,'restore must flush the current project before switching to a recovery snapshot');
assert.match(source,/if\(!flushBeforeRestore\(\)\)/,'restore must abort when the current project cannot be saved safely');
assert.match(source,/validateRecoveryPrimitives\(next\)/,'recovery restore must reject corrupt primitive identities before migration can coerce them');
assert.match(source,/typeof value==='number'\|\|typeof value==='string'/,'recovery primitive validation must restrict numeric edit fields to legacy-safe primitive types');
assert.match(source,/\!\['string','number'\]\.includes\(typeof clip\.asset\)/,'recovery primitive validation must reject coerced media identities');
assert.match(source,/ProfitMenteProjectMigration\?\.migrateImportedProject/,'recovery restore must use the canonical project migration path when available');
assert.match(source,/next=migrateRestoredProject\(next\)/,'recovery restore must migrate snapshots before restoring project identity or persisting them');
assert.match(source,/ProfitMenteProjectImportEngine/,'recovery restore must use the strict project validator after migration');
assert.match(source,/new ImportEngine\(\)\.normalize\(next\)/,'migrated recovery snapshots must pass canonical project import validation');
assert.match(source,/next=validateMigratedRecovery\(next\)/,'canonical validation must run before a recovery snapshot becomes active');
assert.match(source,/if\(typeof persist==='function'\)persist\(\);else if\(typeof originalPersist==='function'\)originalPersist\(\)/,'restored snapshots must use the full persistence chain so saved projects are updated immediately');
assert.match(source,/lib\?\.load&&lib\.load\(next\.libraryId\)/,'restore must verify that a saved project identity still exists');
assert.match(source,/delete copy\.libraryId/,'orphaned recovery snapshots must become drafts instead of keeping a dangling library id');
assert.match(source,/recovered:true/,'recovery must announce the restored project so project-scoped integrations can resync');

const primitivePos=source.indexOf('next=validateRecoveryPrimitives(next)');
const migrationPos=source.indexOf('next=migrateRestoredProject(next)');
const validationPos=source.indexOf('next=validateMigratedRecovery(next)');
const normalizePos=source.indexOf('next=normalizeRestoredProject(next)');
assert.ok(primitivePos>=0&&migrationPos>primitivePos,'recovery restore must inspect raw primitive identities before legacy migration');
assert.ok(validationPos>migrationPos,'recovery restore must validate the canonical migrated project after migration');
assert.ok(normalizePos>validationPos,'library identity normalization must happen only after project validation');

new vm.Script(source,{filename:'recovery-integration.js'});
console.log('Recovery restore persistence wiring OK');
