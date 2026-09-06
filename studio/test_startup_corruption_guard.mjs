import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

class Storage {
  constructor(seed={}){this.m=new Map(Object.entries(seed))}
  getItem(k){return this.m.has(k)?this.m.get(k):null}
  setItem(k,v){this.m.set(k,String(v))}
  removeItem(k){this.m.delete(k)}
}

const source=fs.readFileSync(new URL('./startup-project-guard.js',import.meta.url),'utf8');
const appSource=fs.readFileSync(new URL('./app.js',import.meta.url),'utf8');
function boot(seed){
  const localStorage=new Storage(seed),document={documentElement:{dataset:{}}},globalThis={localStorage},consoleStub={warn(){}};
  vm.runInNewContext(source,{globalThis,document,console:consoleStub,Date});
  return {api:globalThis.ProfitMenteStartupProjectGuard,result:globalThis.__profitmenteStartupProjectGuard,recovered:globalThis.__profitmenteStartupRecovered,localStorage,document};
}

{
  const raw=JSON.stringify({version:'1.3',name:'Bien',duration:45,clips:[]});
  const {result,recovered,localStorage}=boot({'profitmente-project':raw});
  assert.equal(result.ok,true);
  assert.equal(result.project.name,'Bien');
  assert.ok(Array.isArray(result.project.clips));
  assert.equal(localStorage.getItem('profitmente-project'),raw,'valid startup project remains untouched');
  assert.equal(localStorage.getItem('profitmente-project-corrupt-backup'),null);
  assert.equal(JSON.parse(localStorage.getItem('profitmente-project-last-good')).name,'Bien','valid startup state refreshes the last-known-good snapshot');
  assert.equal(recovered,undefined);
}

for(const raw of ['{"broken"',JSON.stringify([]),JSON.stringify(null),JSON.stringify({name:'Bad',clips:{}})]){
  const {result,recovered,localStorage,document}=boot({'profitmente-project':raw});
  assert.equal(result.quarantined,true);
  assert.ok(Array.isArray(result.project.clips),'corrupt state receives a runtime-safe fallback project');
  assert.equal(localStorage.getItem('profitmente-project'),null,'corrupt primary state is removed so Studio can boot cleanly');
  assert.equal(localStorage.getItem('profitmente-project-corrupt-backup'),raw,'raw corrupt value is preserved for forensic/manual recovery');
  assert.equal(recovered?.reason,'corrupt-project-storage');
  assert.equal(document.documentElement.dataset.projectRecovered,'corrupt-startup');
}

{
  const good={version:'1.3',name:'Recuperable',mode:'Manual',duration:61,format:'16:9',clips:[{id:'c1',track:0,start:0,duration:4}]};
  const {api,localStorage}=boot({});
  api.persist(localStorage,good);
  assert.equal(JSON.parse(localStorage.getItem(api.PRIMARY_KEY)).name,'Recuperable');
  assert.equal(JSON.parse(localStorage.getItem(api.LAST_GOOD_KEY)).name,'Recuperable','every successful save keeps a valid recovery snapshot');
  localStorage.setItem(api.PRIMARY_KEY,'{"truncated"');
  const next=boot(Object.fromEntries(localStorage.m));
  assert.equal(next.result.ok,true,'last-known-good recovery should boot successfully');
  assert.equal(next.result.recoveredLastGood,true);
  assert.equal(next.result.quarantined,true,'damaged primary is still quarantined for diagnosis');
  assert.equal(next.result.project.name,'Recuperable');
  assert.equal(next.result.project.duration,61);
  assert.equal(next.recovered?.reason,'last-good-project-recovered');
  assert.equal(next.document.documentElement.dataset.projectRecovered,'last-good-startup');
  assert.equal(JSON.parse(next.localStorage.getItem(api.PRIMARY_KEY)).name,'Recuperable','recovery repairs the primary project slot');
  assert.equal(next.localStorage.getItem(api.BACKUP_KEY),'{"truncated"','corrupt raw primary is preserved even when automatic recovery succeeds');
}

{
  const raw='{"broken"';
  const {result,recovered,localStorage}=boot({'profitmente-project':raw,'profitmente-project-last-good':'[]'});
  assert.equal(result.ok,false,'invalid recovery snapshot must not be trusted');
  assert.equal(result.fallback,true);
  assert.equal(result.project.name,'Nuevo video');
  assert.equal(recovered?.reason,'corrupt-project-storage');
  assert.equal(localStorage.getItem('profitmente-project'),null);
}

{
  const raw=JSON.stringify({name:'Legacy',clips:null,duration:'30',format:'bad-format',mode:'bad-mode'});
  const {result,localStorage}=boot({'profitmente-project':raw});
  assert.equal(result.ok,true,'recoverable legacy project should be normalized instead of quarantined');
  assert.equal(result.project.name,'Legacy');
  assert.deepEqual(Array.from(result.project.clips),[]);
  assert.equal(result.project.duration,30);
  assert.equal(result.project.format,'9:16');
  assert.equal(result.project.mode,'Automático');
  assert.equal(localStorage.getItem('profitmente-project'),raw,'normalization must not destroy the original stored project');
}

{
  const {result,localStorage}=boot({});
  assert.equal(result.ok,true);
  assert.equal(result.empty,true);
  assert.ok(Array.isArray(result.project.clips),'empty first launch receives a safe default project');
  assert.equal(localStorage.getItem('profitmente-project'),null,'empty first launch stays empty');
}

{
  const lastGood=JSON.stringify({name:'Último válido',mode:'Manual',duration:24,format:'1:1',clips:[]});
  const {result,recovered,localStorage}=boot({'profitmente-project-last-good':lastGood});
  assert.equal(result.recoveredLastGood,true,'a missing primary can be restored from the last-known-good snapshot');
  assert.equal(result.project.name,'Último válido');
  assert.equal(recovered?.reason,'last-good-project-recovered');
  assert.equal(JSON.parse(localStorage.getItem('profitmente-project')).name,'Último válido');
}

{
  const storage={getItem(){throw new Error('denied')}};
  const context={globalThis:{localStorage:storage},document:{documentElement:{dataset:{}}},console:{warn(){}},Date};
  vm.runInNewContext(source,context);
  const result=context.globalThis.__profitmenteStartupProjectGuard;
  assert.equal(result.storageUnavailable,true,'storage access failure is reported without crashing the guard');
  assert.ok(Array.isArray(result.project.clips),'storage denial still yields a runtime-safe in-memory project');
  assert.equal(context.globalThis.__profitmenteStartupRecovered.reason,'storage-unavailable');
  assert.equal(context.document.documentElement.dataset.projectRecovered,'storage-unavailable');
}

assert.match(appSource,/__profitmenteStartupProjectGuard/,'app runtime must consume the startup guard result');
assert.doesNotMatch(appSource,/JSON\.parse\(localStorage\.getItem\(/,'app runtime must not repeat the unsafe startup localStorage read');
assert.match(appSource,/guardApi\?\.persist\)guardApi\.persist\(localStorage,project\)/,'project persistence must use the guarded last-known-good writer');
assert.match(appSource,/catch\(error\)\{globalThis\.__profitmenteStartupRecovered=/,'project persistence must tolerate localStorage write failures');

console.log('Startup corruption guard OK');
