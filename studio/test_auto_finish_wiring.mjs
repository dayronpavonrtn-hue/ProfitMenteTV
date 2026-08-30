import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const bootstrap=await readFile(new URL('./feature-bootstrap.js',import.meta.url),'utf8');
const integration=await readFile(new URL('./auto-finish-integration.js',import.meta.url),'utf8');
const beats=await readFile(new URL('./beat-detect-integration.js',import.meta.url),'utf8');

const transitionCore=bootstrap.indexOf("['auto-transition-engine.js','ProfitMenteAutoTransitionEngine']");
const transitionUi=bootstrap.indexOf("['auto-transition-integration.js','ProfitMenteAutoTransitions']");
const coreIndex=bootstrap.indexOf("['auto-finish-engine.js','ProfitMenteAutoFinishEngine']");
const preflightIndex=bootstrap.indexOf("['export-preflight.js','ProfitMenteExportPreflight']");
const uiIndex=bootstrap.indexOf("['auto-finish-integration.js','ProfitMenteAutoFinish']");
assert.ok(transitionCore>=0&&transitionUi>transitionCore&&coreIndex>transitionUi,'transition tools must load before Auto Finish');
assert.ok(coreIndex>=0&&preflightIndex>coreIndex&&uiIndex>preflightIndex,'export preflight must load before Auto Finish integration');
assert.match(integration,/ProfitMenteQAAutofix\?\.repair/);
assert.match(integration,/ProfitMenteSmartMix\?\.apply/);
assert.match(integration,/ProfitMenteBeatDetect\?\.run/);
assert.match(integration,/ProfitMenteBeatSync\?\.run/);
assert.match(integration,/ProfitMenteAutoTransitions\?\.run/);
assert.match(integration,/new window\.ProfitMenteQAEngine\(\)\.inspect\(project,assets\)/,'Auto Finish must run QA engine directly');
assert.match(integration,/ProfitMenteExportPreflightRun/,'Auto Finish must run export preflight after passing QA');
assert.match(integration,/lastReport\?\.ok/,'preflight must only run after QA passes');
assert.match(integration,/preflight:lastPreflight/,'Auto Finish must publish preflight result');
assert.match(integration,/MP4 directo listo/,'Auto Finish must surface direct MP4 readiness');
assert.match(integration,/paquete exportable/,'Auto Finish must preserve the free package fallback');
assert.match(integration,/QA \$\{lastReport\.score\}\/100/,'Auto Finish must surface QA score');
assert.match(integration,/bloqueo QA/,'Auto Finish must report blocking QA errors');
assert.match(integration,/profitmente:auto-finish-complete/,'Auto Finish must publish completion details');
assert.match(integration,/get lastReport\(\)/,'Auto Finish must expose the latest QA report');
assert.match(integration,/get lastPreflight\(\)/,'Auto Finish must expose the latest export preflight');
assert.match(integration,/return \{completed,skipped,qa:lastReport,preflight:lastPreflight\}/,'Auto Finish run must return QA and preflight results');
assert.match(integration,/\$0 local/);
assert.match(integration,/No publica ni usa servicios de pago/);
assert.match(beats,/trackUnavailable/);
assert.match(beats,/!trackUnavailable\(c\)/);

console.log('auto-finish wiring regression: ok');
