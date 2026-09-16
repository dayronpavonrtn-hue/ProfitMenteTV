const fs=require('fs');
const path=require('path');
const vm=require('vm');
const assert=require('assert');

const root=path.resolve(__dirname,'..');
const guardSource=fs.readFileSync(path.join(root,'startup-project-guard.js'),'utf8');
const importSource=fs.readFileSync(path.join(root,'project-import-engine.js'),'utf8');
const integrationSource=fs.readFileSync(path.join(root,'project-import-integration.js'),'utf8');

const context={console,globalThis:{}};
context.globalThis=context;
vm.createContext(context);
vm.runInContext(guardSource,context);
const guard=context.ProfitMenteStartupProjectGuard;
assert(guard&&typeof guard.normalizeProject==='function','startup project contract unavailable');

const valid={name:'Bundle',mode:'Manual',duration:12,format:'9:16',fps:30,renderQuality:'high',clips:[{id:'v1',track:0,start:0,duration:12,asset:'media-1',fitMode:'cover'}]};
assert(guard.normalizeProject(valid),'valid bundle project must satisfy startup contract');

for(const bad of [
  {...valid,mode:'invalid'},
  {...valid,duration:0},
  {...valid,fps:25},
  {...valid,clips:[{...valid.clips[0],track:9}]},
  {...valid,clips:[{...valid.clips[0],start:11,duration:2}]},
  {...valid,clips:[valid.clips[0],{...valid.clips[0]}]},
]) assert.strictEqual(guard.normalizeProject(bad),null,'invalid bundle project must be rejected by shared project contract');

assert(/ImportEngine/.test(integrationSource)&&/\.normalize\(restored\.project\)/.test(integrationSource),'bundle opening must normalize imported project before activation');
assert(/validateRestoredBundle\(restored\)/.test(integrationSource),'bundle opening must validate restored media references');
assert(/protectBundleMediaIdentity\(restored\)/.test(integrationSource),'bundle opening must protect media identity collisions');
assert(/rollbackBundleOpen/.test(integrationSource),'bundle opening must preserve rollback support');
assert(/MAX_RENDER_DURATION/.test(importSource),'import engine must enforce local renderer duration limits');

console.log('bundle import/startup contract regression: ok');
