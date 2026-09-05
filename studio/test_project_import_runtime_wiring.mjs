import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync(new URL('./index.html',import.meta.url),'utf8');
const engineAt=html.indexOf('<script src="project-import-engine.js"></script>');
const libraryAt=html.indexOf('<script src="project-library.js"></script>');
const integrationAt=html.indexOf('<script src="project-import-integration.js"></script>');

assert.ok(engineAt>=0,'index.html must load the guarded project import engine');
assert.ok(libraryAt>=0,'index.html must load the persistent project library');
assert.ok(integrationAt>=0,'index.html must load the primary project import integration');
assert.ok(engineAt<libraryAt,'import validation must be available before project-library wiring');
assert.ok(libraryAt<integrationAt,'primary import integration must install after ProjectTransfer is exposed by project-library');

const integration=fs.readFileSync(new URL('./project-import-integration.js',import.meta.url),'utf8');
assert.match(integration,/input\.onchange=async e=>/,'integration must replace app.js primary JSON onchange handler');
assert.match(integration,/ProfitMenteProjectTransfer/,'primary import must route through the durable project library transfer when available');

console.log('Project import runtime wiring QA passed');
