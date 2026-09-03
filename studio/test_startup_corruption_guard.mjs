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
function boot(seed){
  const localStorage=new Storage(seed),document={documentElement:{dataset:{}}},globalThis={localStorage},consoleStub={warn(){}};
  vm.runInNewContext(source,{globalThis,document,console:consoleStub,Date});
  return {api:globalThis.ProfitMenteStartupProjectGuard,result:globalThis.__profitmenteStartupProjectGuard,recovered:globalThis.__profitmenteStartupRecovered,localStorage,document};
}

{
  const raw=JSON.stringify({version:'1.3',name:'Bien',duration:45,clips:[]});
  const {result,recovered,localStorage}=boot({'profitmente-project':raw});
  assert.equal(result.ok,true);
  assert.equal(localStorage.getItem('profitmente-project'),raw,'valid startup project remains untouched');
  assert.equal(localStorage.getItem('profitmente-project-corrupt-backup'),null);
  assert.equal(recovered,undefined);
}

for(const raw of ['{"broken"',JSON.stringify([]),JSON.stringify(null),JSON.stringify({name:'Bad',clips:{}})]){
  const {result,recovered,localStorage,document}=boot({'profitmente-project':raw});
  assert.equal(result.quarantined,true);
  assert.equal(localStorage.getItem('profitmente-project'),null,'corrupt primary state is removed so app.js can boot cleanly');
  assert.equal(localStorage.getItem('profitmente-project-corrupt-backup'),raw,'raw corrupt value is preserved for forensic/manual recovery');
  assert.equal(recovered?.reason,'corrupt-project-storage');
  assert.equal(document.documentElement.dataset.projectRecovered,'corrupt-startup');
}

{
  const {result,localStorage}=boot({});
  assert.equal(result.ok,true);
  assert.equal(result.empty,true);
  assert.equal(localStorage.getItem('profitmente-project'),null,'empty first launch stays empty');
}

{
  const storage={getItem(){throw new Error('denied')}};
  const context={globalThis:{localStorage:storage},document:{documentElement:{dataset:{}}},console:{warn(){}},Date};
  vm.runInNewContext(source,context);
  assert.equal(context.globalThis.__profitmenteStartupProjectGuard.storageUnavailable,true,'storage access failure is reported without crashing the guard');
}

console.log('Startup corruption guard OK');
