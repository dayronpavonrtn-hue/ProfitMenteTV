import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const bootstrap=await readFile(new URL('./feature-bootstrap.js',import.meta.url),'utf8');
const integration=await readFile(new URL('./auto-finish-integration.js',import.meta.url),'utf8');
const beats=await readFile(new URL('./beat-detect-integration.js',import.meta.url),'utf8');

const coreIndex=bootstrap.indexOf("['auto-finish-engine.js','ProfitMenteAutoFinishEngine']");
const uiIndex=bootstrap.indexOf("['auto-finish-integration.js','ProfitMenteAutoFinish']");
assert.ok(coreIndex>=0&&uiIndex>coreIndex,'Auto Finish core must load before integration');
assert.match(integration,/ProfitMenteQAAutofix\?\.repair/);
assert.match(integration,/ProfitMenteSmartMix\?\.apply/);
assert.match(integration,/ProfitMenteBeatDetect\?\.run/);
assert.match(integration,/ProfitMenteBeatSync\?\.run/);
assert.match(integration,/\$0 local/);
assert.match(integration,/No publica ni usa servicios de pago/);
assert.match(beats,/trackUnavailable/);
assert.match(beats,/!trackUnavailable\(c\)/);

console.log('auto-finish wiring regression: ok');
