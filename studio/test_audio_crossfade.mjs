import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
const require=createRequire(import.meta.url);
const {ProfitMenteAudioEnvelopeEngine}=require('./audio-envelope-engine.js');
global.ProfitMenteAudioEnvelopeEngine=ProfitMenteAudioEnvelopeEngine;
const {ProfitMenteAudioCrossfadeEngine}=require('./audio-crossfade-engine.js');
const engine=new ProfitMenteAudioCrossfadeEngine(new ProfitMenteAudioEnvelopeEngine());
const assets=[{id:'a',type:'audio'},{id:'b',type:'audio'},{id:'c',type:'audio'}];
const make=()=>({clips:[
  {id:1,track:5,asset:'a',start:0,duration:5,fadeIn:.2,fadeOut:.25},
  {id:2,track:5,asset:'b',start:4,duration:4,fadeIn:.18,fadeOut:.3}
]});
let project=make();
let p=engine.nextOverlap(project,assets,1);
assert.equal(p.ok,true);assert.equal(p.overlap,1);assert.equal(p.duration,1,'usa el solape completo cuando cabe');
let r=engine.applyNext(project,assets,1);
assert.equal(r.ok,true);assert.equal(project.clips[0].fadeOut,1);assert.equal(project.clips[1].fadeIn,1);
assert.equal(project.clips[0].fadeIn,.2,'preserva fade externo del primer clip');
assert.equal(project.clips[1].fadeOut,.3,'preserva fade externo del segundo clip');

project=make();project.clips[1].start=5;
r=engine.applyNext(project,assets,1);assert.equal(r.ok,false);assert.equal(r.reason,'no-overlap');
project=make();project.clips[1].start=2;project.clips[0].fadeIn=4;
p=engine.nextOverlap(project,assets,1);assert.equal(p.ok,true);assert.equal(p.duration,1,'limita crossfade para no invadir fade opuesto');
project=make();project.clips[1].locked=true;const snapshot=JSON.stringify(project);
r=engine.applyNext(project,assets,1);assert.equal(r.ok,false);assert.equal(r.reason,'locked');assert.equal(JSON.stringify(project),snapshot,'lock no muta proyecto');
project=make();project.trackState={'5':{locked:true}};r=engine.applyNext(project,assets,1);assert.equal(r.ok,false);assert.equal(r.reason,'locked');
project=make();project.clips[1].track=6;r=engine.applyNext(project,assets,1);assert.equal(r.ok,false);assert.equal(r.reason,'no-overlap','no cruza pistas');
project=make();project.clips[0].duration='bad';r=engine.applyNext(project,assets,1);assert.equal(r.ok,false);assert.equal(r.reason,'invalid-timing');
project=make();project.clips.push({id:3,track:5,asset:'c',start:4.5,duration:2});p=engine.nextOverlap(project,assets,1);assert.equal(p.next.id,2,'elige el siguiente cronológico');

const integration=readFileSync(new URL('./audio-crossfade-integration.js',import.meta.url),'utf8');
const envelopeIntegration=readFileSync(new URL('./audio-envelope-integration.js',import.meta.url),'utf8');
assert.match(integration,/ProfitMenteAudioCrossfadeEngine/);
assert.match(integration,/persist\?\.\(\)/,'persiste una edición válida');
assert.match(integration,/renderAt\?\.\(/,'refresca preview');
assert.doesNotMatch(integration,/fetch\(|https?:\/\//,'crossfade permanece local y $0');
assert.match(envelopeIntegration,/audio-crossfade-engine\.js/,'inspector carga motor crossfade');
assert.match(envelopeIntegration,/audio-crossfade-integration\.js/,'inspector carga integración crossfade');
console.log('Audio crossfade regression OK');
