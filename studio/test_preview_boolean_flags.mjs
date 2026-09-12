import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require=createRequire(import.meta.url);
globalThis.window=globalThis;
globalThis.assets=[];
globalThis.project={clips:[],mode:'Manual'};
globalThis.canvas={width:540,height:960};
globalThis.ctx={};
globalThis.$=()=>null;

require('./preview-engine.js');
const api=globalThis.ProfitMentePreviewEngine;
assert.ok(api,'preview engine should expose its testable API');

assert.equal(api.strictFlag(true),true,'boolean true must enable a flip');
for(const value of [false,'true','false','1','0',1,0,[],{},null,undefined]){
  assert.equal(api.strictFlag(value),false,`non-boolean flip value ${String(value)} must stay disabled`);
}

console.log('preview strict boolean flag regression: ok');
