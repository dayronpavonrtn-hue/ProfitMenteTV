import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {ProfitMenteQAEngine}=require('./qa-engine.js');
globalThis.ProfitMenteQAEngine=ProfitMenteQAEngine;
const guard=require('./qa-media-identity-guard.js');

assert.equal(guard.mediaIdKey(7),'n:7');
assert.equal(guard.mediaIdKey('007'),'n:7');
assert.equal(guard.mediaIdKey('7.0'),'n:7');
assert.equal(guard.mediaIdKey(' asset-a '),'s:asset-a');

const qa=new ProfitMenteQAEngine();
const project={duration:5,format:'9:16',clips:[{id:'clip-1',name:'Canonical clip',track:0,start:0,duration:5,asset:'007'}]};
const assets=[{id:7,name:'canonical.mp4',type:'video',duration:5,width:1080,height:1920}];
const result=qa.inspect(project,assets);
assert.equal(result.issues.some(issue=>issue.includes('Medio faltante')),false,'aliases numéricos del mismo medio no deben bloquear QA');
assert.equal(result.issues.some(issue=>issue.includes('Tipo de medio incompatible')),false);

const collision=qa.inspect(project,[...assets,{id:'7.0',name:'duplicate.mp4',type:'video',duration:5,width:1080,height:1920}]);
assert.equal(collision.ok,false);
assert.equal(collision.metrics.mediaIdentityCollisions,1);
assert.ok(collision.issues.some(issue=>issue.includes('IDs de medio ambiguos')));

const textProject={...project,clips:[{...project.clips[0],asset:' asset-a '}]};
const textResult=qa.inspect(textProject,[{id:'asset-a',name:'text.mp4',type:'video',duration:5,width:1080,height:1920}]);
assert.equal(textResult.issues.some(issue=>issue.includes('Medio faltante')),false,'IDs de texto deben conservar su identidad normalizada');

console.log('QA canonical media identity regression OK');
