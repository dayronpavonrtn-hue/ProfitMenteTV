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
assert.match(appSource,/try\{localStorage\.setItem\('profitmente-project'/,'project persistence must tolerate localStorage write failures');

console.log('Startup corruption guard OK');
