import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

class Storage {
  constructor(seed={}){this.m=new Map(Object.entries(seed))}
  getItem(k){return this.m.has(k)?this.m.get(k):null}
  setItem(k,v){this.m.set(k,String(v))}
  removeItem(k){this.m.delete(k)}
}

const source=fs.readFileSync(new URL('./history-engine.js',import.meta.url),'utf8');
function boot(seed){
  const localStorage=new Storage(seed),window={};
  vm.runInNewContext(source,{window,localStorage,console:{warn(){}}});
  return {window,localStorage};
}

{
  const raw=JSON.stringify({version:'1.3',name:'Bien',duration:45,clips:[]});
  const {window,localStorage}=boot({'profitmente-project':raw});
  assert.equal(localStorage.getItem('profitmente-project'),raw,'valid startup project remains untouched');
  assert.equal(localStorage.getItem('profitmente-project-corrupt-backup'),null);
  assert.equal(window.__profitmenteStartupRecovered,undefined);
}

for(const raw of ['{"broken"',JSON.stringify([]),JSON.stringify({name:'Bad',clips:{}})]){
  const {window,localStorage}=boot({'profitmente-project':raw});
  assert.equal(localStorage.getItem('profitmente-project'),null,'corrupt primary state is removed so app.js can boot cleanly');
  assert.equal(localStorage.getItem('profitmente-project-corrupt-backup'),raw,'raw corrupt value is preserved for forensic/manual recovery');
  assert.equal(window.__profitmenteStartupRecovered?.reason,'corrupt-project-storage');
}

{
  const {window,localStorage}=boot({});
  assert.equal(localStorage.getItem('profitmente-project'),null,'empty first launch stays empty');
  assert.equal(window.__profitmenteStartupRecovered,undefined);
}

console.log('Startup corruption guard OK');
