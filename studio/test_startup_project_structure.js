const assert=require('assert');
require('./startup-project-guard.js');
const guard=globalThis.ProfitMenteStartupProjectGuard;
assert.ok(guard,'startup project guard must load');
assert.strictEqual(guard.MAX_PROJECT_CLIPS,10000);
const base={name:'Saved',mode:'Manual',duration:45,format:'9:16',clips:[]};
const clip={id:'clip-1',track:0,start:0,duration:10};
assert.ok(guard.normalizeProject(base));
assert.strictEqual(guard.normalizeProject({...base,clips:[null]}),null,'null clips must not reach the editor');
assert.strictEqual(guard.normalizeProject({...base,clips:['bad']}),null,'scalar clips must not reach the editor');
assert.strictEqual(guard.normalizeProject({...base,clips:[[]]}),null,'array clips must not reach the editor');
assert.strictEqual(guard.normalizeProject({...base,clips:[{}]}),null,'clips without valid timeline scalars must not reach the editor');
assert.ok(guard.normalizeProject({...base,clips:[clip]}),'valid saved clips must recover');
for(const [field,value] of [['volume',2.1],['sourceVolume',-0.1],['positionX',101],['positionY',-101],['scale',0],['rotation',181],['opacity',1.1],['fadeIn',11],['fadeOut',-1]]){
  assert.strictEqual(guard.normalizeProject({...base,clips:[{...clip,[field]:value}]}),null,`${field} outside renderer bounds must be rejected`);
}
for(const field of ['muted','disabled','flipX','flipY']){
  assert.strictEqual(guard.normalizeProject({...base,clips:[{...clip,[field]:'false'}]}),null,`${field} must be a real boolean`);
  assert.ok(guard.normalizeProject({...base,clips:[{...clip,[field]:false}]}),`${field}=false must remain valid`);
}
assert.ok(guard.normalizeProject({...base,clips:[{...clip,volume:1.5,sourceVolume:.8,positionX:25,positionY:-25,scale:2,rotation:90,opacity:.5,fadeIn:2,fadeOut:3,muted:false,disabled:false,flipX:true,flipY:false}]}),'valid render controls must recover');
const oversized=Array.from({length:guard.MAX_PROJECT_CLIPS+1},()=>clip);
assert.strictEqual(guard.normalizeProject({...base,clips:oversized}),null,'startup recovery must reject timelines beyond the import/render project budget');
const store=new Map();
store.set(guard.PRIMARY_KEY,JSON.stringify({...base,clips:[{...clip,opacity:'not-a-number'}]}));
const storage={getItem:key=>store.has(key)?store.get(key):null,setItem:(key,value)=>store.set(key,value),removeItem:key=>store.delete(key)};
const result=guard.guard(storage);
assert.strictEqual(result.quarantined,true,'malformed startup projects must be quarantined');
assert.ok(store.has(guard.BACKUP_KEY),'malformed startup projects must be preserved for recovery');
assert.strictEqual(store.has(guard.PRIMARY_KEY),false,'malformed primary project must not remain active');
console.log('startup project structure and render controls: ok');
