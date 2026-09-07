import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {ProfitMenteQAEngine}=require('./qa-engine.js');
globalThis.ProfitMenteQAEngine=ProfitMenteQAEngine;
require('./qa-strict-project-guard.js');

const Guard=globalThis.ProfitMenteQAStrictProjectGuard;
assert.ok(Guard,'guard debe registrarse');
assert.equal(Guard.canonicalTrack('06'),6);
assert.equal(Guard.canonicalTrack('4.0'),4);
for(const value of [true,false,[4],{},new Number(4),Symbol('4'),6.5,7])assert.equal(Guard.canonicalTrack(value),null);
assert.equal(Guard.finiteNumber(' 4.5 ',null),4.5);
for(const value of [true,false,[4],{},new Number(4),Symbol('4'),''])assert.equal(Guard.finiteNumber(value,null),null);
assert.equal(Guard.strictFlag(true),true);
for(const value of [false,'true',1,{},[]])assert.equal(Guard.strictFlag(value),false);

const clean={duration:'10',trackState:{'06':{muted:false},'4.0':{solo:true}},clips:[{id:'v',name:'Visual',track:'00',start:'0',duration:'10'},{id:'c',name:'Caption',track:'03',start:'0',duration:'2'}]};
assert.deepEqual(Guard.invalidProjectFields(clean),[]);
const sanitized=Guard.sanitizeProject(clean);
assert.equal(sanitized.duration,10);
assert.equal(sanitized.clips[0].track,0);
assert.equal(sanitized.trackState[6].muted,false);
assert.equal(sanitized.trackState[4].solo,true);

const corrupt={duration:true,trackState:{'06':{muted:'false'},bad:{hidden:true}},clips:[{id:'bad',name:'Bad',track:false,start:[0],duration:{valueOf(){return 2}},speed:new Number(1),volume:'0.8'}]};
const issues=Guard.invalidProjectFields(corrupt);
assert.ok(issues.some(x=>x.includes('Duración de proyecto inválida')));
assert.ok(issues.some(x=>x.includes('Pista inválida: Bad')));
assert.ok(issues.some(x=>x.includes('Inicio de clip inválido: Bad')));
assert.ok(issues.some(x=>x.includes('Duración de clip inválido: Bad')));
assert.ok(issues.some(x=>x.includes('Velocidad inválido: Bad')));
assert.ok(issues.some(x=>x.includes('Bandera muted inválida en pista 06')));
assert.ok(issues.some(x=>x.includes('Identidad de pista inválida en estado: bad')));

const qa=new ProfitMenteQAEngine();
const report=qa.inspect(corrupt,[]);
assert.equal(report.ok,false);
assert.ok(report.metrics.invalidProjectFields>=6);
assert.ok(report.issues.some(x=>x.includes('Pista inválida: Bad')));

console.log('QA strict project guard regression OK');