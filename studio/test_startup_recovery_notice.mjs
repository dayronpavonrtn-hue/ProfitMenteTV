import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {ProfitMenteStartupRecoveryNoticeEngine:Engine}=require('./startup-recovery-notice.js');

assert.match(Engine.message({reason:'last-good-project-recovered'}),/recuperó automáticamente/i);
assert.match(Engine.message({reason:'corrupt-project-storage'}),/aisló/i);
assert.match(Engine.message({reason:'storage-unavailable'}),/memoria/i);
assert.equal(Engine.message({reason:'other'}),'');
assert.equal(Engine.safeFileName(' Mi Proyecto: 01 '),'Mi-Proyecto-01');

class Storage{constructor(){this.m=new Map()}getItem(k){return this.m.has(k)?this.m.get(k):null}setItem(k,v){this.m.set(k,String(v))}}
const storage=new Storage();storage.setItem('backup','{broken-json');
assert.equal(Engine.readBackup(storage,'backup'),'{broken-json','isolated raw backup must remain downloadable even if JSON is corrupt');
assert.equal(Engine.readBackup(storage,'missing'),null);
assert.equal(Engine.readBackup({getItem(){throw new Error('blocked')}},'backup'),null,'storage errors must fail safe');

const notice=fs.readFileSync(new URL('./startup-recovery-notice.js',import.meta.url),'utf8');
assert.match(notice,/__profitmenteStartupRecovered/,'notice must use startup recovery metadata');
assert.match(notice,/insertBefore\(section,aside\.firstChild\)/,'recovery warning must be prominent in the sidebar');
assert.match(notice,/Descargar copia aislada/,'quarantined startup data must be downloadable');
assert.match(notice,/projectRecoveryNotice/,'recovery state must be exposed to UI diagnostics');
assert.match(notice,/setTimeout\(announce,200\)/,'recovery message must survive later bootstrap status updates');

const checkpoint=fs.readFileSync(new URL('./automation-checkpoint.js',import.meta.url),'utf8');
assert.match(checkpoint,/ensureStartupRecoveryNotice\(\)/,'normal advanced-feature startup must wire the recovery notice');
assert.match(checkpoint,/startup-recovery-notice\.js/,'recovery notice module must be loaded locally');
assert.doesNotMatch(notice+checkpoint,/stripe|openai|anthropic|runway|replicate|fal\.ai|elevenlabs|api[_-]?key|billing/i,'startup recovery notice must remain inside the $0 boundary');

console.log('Startup recovery notice + isolated backup regression OK');
