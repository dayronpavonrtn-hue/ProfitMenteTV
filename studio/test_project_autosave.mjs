import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {ProfitMenteProjectAutosaveEngine:Engine}=require('./project-autosave.js');

const base={name:'Proyecto A',duration:45,format:'9:16',mode:'Manual',clips:[]};
assert.deepEqual(Engine.fields(base),{name:'Proyecto A',duration:45,format:'9:16',mode:'Manual'});
assert.deepEqual(Engine.merge(base,{name:'  Proyecto B  ',duration:'60',format:'16:9',mode:'Automático'}),{name:'Proyecto B',duration:60,format:'16:9',mode:'Automático'});
assert.equal(Engine.merge(base,{duration:''}).duration,45,'clearing the duration field temporarily must not reset the project');
assert.equal(Engine.merge(base,{duration:'0'}).duration,1,'duration must remain valid');
assert.equal(Engine.merge(base,{format:'bad'}).format,'9:16','invalid formats must fall back safely');
assert.equal(Engine.merge(base,{mode:'bad'}).mode,'Manual','invalid modes must fall back safely');
assert.equal(Engine.changed(base,Engine.merge(base,{name:'Proyecto A'})),false);
assert.equal(Engine.changed(base,Engine.merge(base,{name:'Proyecto B'})),true);

const src=fs.readFileSync(new URL('./project-autosave.js',import.meta.url),'utf8');
assert.match(src,/setTimeout\(\(\)=>flush\('propiedades'\),450\)/,'text/number edits must debounce before persistence');
assert.match(src,/format\.addEventListener\('change',\(\)=>flush\('formato'\)\)/,'format changes must save immediately');
assert.match(src,/modeInput\.addEventListener\('change',\(\)=>flush\('modo'\)\)/,'mode changes must save immediately');
assert.match(src,/if\(typeof persist==='function'\)persist\(\)/,'autosave must use the wrapped project persistence path');
assert.match(src,/nextFingerprint=JSON\.stringify\(engine\.fields\(next\)\)/,'autosave must compare against the last successfully persisted fingerprint');
assert.match(src,/if\(last===nextFingerprint\)return false/,'failed persistence must remain dirty and eligible for retry');
assert.match(src,/last=nextFingerprint;retryCount=0/,'successful persistence must clear retry state');
assert.match(src,/profitmente:project-autosave-error/,'persistence failures must surface a dedicated error event');
assert.match(src,/retryCount<3.*?setTimeout\(\(\)=>flush\('reintento'\),1500\*retryCount\)/s,'transient persistence failures must retry with bounded backoff');
assert.match(src,/reason!=='cierre'.*?retryCount<3/s,'browser shutdown must not schedule background retries');
assert.match(src,/previous\.duration!==next\.duration\|\|previous\.format!==next\.format/,'layout-affecting edits must refresh timeline geometry');
assert.match(src,/beforeunload.*?flush\('cierre'\)/s,'pending properties must flush before browser unload');
assert.match(src,/pagehide.*?flush\('cierre'\)/s,'pending properties must flush on page hide/mobile tab discard path');
assert.match(src,/profitmente:project-opened.*?cancel\(\);retryCount=0;last=engine\.fingerprint\(project\)/s,'switching projects must cancel pending retries from the previous project');

const bootstrap=fs.readFileSync(new URL('./feature-bootstrap.js',import.meta.url),'utf8');
const recovery=bootstrap.indexOf("['recovery-integration.js'");
const autosave=bootstrap.indexOf("['project-autosave.js'");
const preflight=bootstrap.indexOf("['export-preflight.js'");
assert.ok(recovery>=0&&autosave>recovery,'autosave must load after recovery so persistence snapshots are included');
assert.ok(preflight>autosave,'autosave must be active before export/render preflight modules');

console.log('Continuous project autosave regression OK');
