import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../render-clock.js',import.meta.url),'utf8');
vm.runInThisContext(source,{filename:'render-clock.js'});
async function scenario(renderMs){let now=0;const times=[];const clock=new globalThis.ProfitMenteRenderClock({fps:30,now:()=>now,sleep:async ms=>{now+=ms}});const result=await clock.run(.2,async t=>{times.push(t);now+=renderMs});return {result,times}}
const slow=await scenario(80);
assert.ok(Math.abs(slow.result.elapsed-.2)<1e-9,'slow frame rendering must not stretch output duration');
assert.deepEqual(slow.times,[0,.08],'slow renderer must drop frames instead of slowing the project clock');
const fast=await scenario(5);
assert.ok(Math.abs(fast.result.elapsed-.2)<1e-9,'fast rendering must finish on the project duration');
assert.ok(fast.result.frames>=5,'fast renderer should preserve useful frame cadence');
assert.ok(fast.result.lastTime<.2,'no frame may begin after project end');
await assert.rejects(()=>new globalThis.ProfitMenteRenderClock({now:()=>0,sleep:async()=>{}}).run(0,async()=>{}),/Duración de render inválida/);
console.log('render-clock regression OK');
