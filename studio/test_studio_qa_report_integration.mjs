import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync(new URL('./index.html',import.meta.url),'utf8');
const safeScript='<script src="qa-report-integration.js"></script>';
const inlineQa="const qa=new ProfitMenteQAEngine()";
const safeAt=html.indexOf(safeScript);
const legacyAt=html.indexOf(inlineQa);

assert.notEqual(legacyAt,-1,'Studio shell must initialize the QA engine');
assert.notEqual(safeAt,-1,'Studio shell must load the safe QA report integration');
assert.ok(safeAt>legacyAt,'safe QA integration must load after the legacy inline handler so it can replace it');
assert.equal((html.match(/qa-report-integration\.js/g)||[]).length,1,'safe QA integration must be loaded exactly once');

const integration=fs.readFileSync(new URL('./qa-report-integration.js',import.meta.url),'utf8');
assert.equal(integration.includes('innerHTML'),false,'safe QA integration must not inject report data via innerHTML');
assert.match(integration,/btn\.onclick=/,'safe QA integration must replace the QA button handler');
assert.match(integration,/textContent=/,'safe QA integration must render imported/project-derived text inertly');

console.log('Studio safe QA report integration regression passed');
