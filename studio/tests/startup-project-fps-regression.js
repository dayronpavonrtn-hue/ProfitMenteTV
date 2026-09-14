const assert=require('assert');
require('../startup-project-guard.js');

const guard=globalThis.ProfitMenteStartupProjectGuard;
assert(guard,'Startup project guard must be available');

function memoryStorage(seed={}){
  const map=new Map(Object.entries(seed));
  return {
    getItem:key=>map.has(key)?map.get(key):null,
    setItem:(key,value)=>map.set(key,String(value)),
    removeItem:key=>map.delete(key),
    dump:key=>map.get(key)
  };
}

assert.strictEqual(guard.defaultProject().fps,30,'new fallback projects must default to 30 FPS');

for(const fps of [24,30,60]){
  const normalized=guard.normalizeProject({name:'FPS project',duration:10,format:'9:16',mode:'Manual',fps,clips:[]});
  assert.strictEqual(normalized.fps,fps,`supported ${fps} FPS must be preserved`);
}

for(const fps of [undefined,null,'',0,25,29.97,120,'abc']){
  const normalized=guard.normalizeProject({name:'Legacy project',duration:10,format:'9:16',mode:'Manual',fps,clips:[]});
  assert.strictEqual(normalized.fps,30,`unsupported FPS ${String(fps)} must normalize to 30`);
}

assert.strictEqual(
  guard.normalizeProject({duration:10,format:'9:16',mode:'Manual',fps:'60',clips:[]}).fps,
  60,
  'legacy numeric FPS strings must normalize to the canonical numeric value'
);

const legacyStorage=memoryStorage({
  [guard.PRIMARY_KEY]:JSON.stringify({version:'1.2',name:'Legacy',duration:12,format:'16:9',mode:'Manual',clips:[]})
});
const legacyResult=guard.guard(legacyStorage);
assert.strictEqual(legacyResult.project.fps,30,'startup must upgrade legacy projects without FPS');
assert.strictEqual(JSON.parse(legacyStorage.dump(guard.LAST_GOOD_KEY)).fps,30,'last-good snapshot must store canonical FPS');

const recoveryStorage=memoryStorage({
  [guard.PRIMARY_KEY]:'{broken json',
  [guard.LAST_GOOD_KEY]:JSON.stringify({version:'1.3',name:'Recovered',duration:8,format:'1:1',mode:'Automático',fps:24,clips:[]})
});
const recovered=guard.guard(recoveryStorage);
assert.strictEqual(recovered.recoveredLastGood,true,'corrupt primary project should recover the last-good snapshot');
assert.strictEqual(recovered.project.fps,24,'recovery must preserve a supported frame rate');
assert.strictEqual(JSON.parse(recoveryStorage.dump(guard.PRIMARY_KEY)).fps,24,'recovered primary storage must keep canonical FPS');

console.log('Startup project FPS regression tests passed');
