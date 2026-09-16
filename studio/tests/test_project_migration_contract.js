const fs=require('fs');
const path=require('path');
const assert=require('assert');

const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'project-migration-integration.js'),'utf8');

assert(/function validateMigratedProject\(value\)/.test(source),'migration integration must validate migrated projects');
assert(/new ImportEngine\(defaults\)\.normalize\(value\)/.test(source),'migrated projects must pass the import/render contract');
assert(/function migrateWithContract\(value\)/.test(source),'migration must expose a single guarded path');
assert(/const result=migrateWithContract\(project\)/.test(source),'startup/current project migration must use the guarded path');
assert(/return migrateWithContract\(value\)\.project/.test(source),'imported project migration must use the guarded path');
assert(/!result\.project\)throw new Error\('La migración no produjo un proyecto válido'\)/.test(source),'missing migration output must fail closed');
assert(/normalized\.libraryId=value\.libraryId/.test(source),'library identity must survive post-migration normalization');

console.log('project migration contract regression: ok');
