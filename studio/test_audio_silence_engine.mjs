import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const Engine=require('./audio-silence-engine.js');

function approx(actual,expected,tolerance=.03,message='valor inesperado'){
  assert.ok(Math.abs(actual-expected)<=tolerance,`${message}: ${actual} != ${expected}`);
}

const rate=1000;
const samples=new Float32Array(1000);
for(let i=200;i<700;i++)samples[i]=.25;
const detected=Engine.detectChannels([samples],rate,0,1,{thresholdDb:-40,frameMs:20,minSoundMs:60,paddingMs:40});
assert.equal(detected.ok,true,'debe detectar la región con voz');
approx(detected.leading,.16,.03,'padding de entrada');
approx(detected.trailing,.26,.03,'padding de salida');
assert.ok(detected.soundDuration>.5&&detected.soundDuration<.65,'debe conservar margen alrededor del contenido');

const stereo=Engine.detectChannels([samples,samples],rate,0,1,{thresholdDb:-40});
assert.equal(stereo.ok,true,'debe analizar múltiples canales');
const silent=Engine.detectChannels([new Float32Array(500)],rate,0,.5);
assert.equal(silent.ok,false);assert.equal(silent.reason,'silence');

const fastClip={id:'fast',track:4,start:3,duration:2,sourceOffset:1,speed:2};
const fastPlan=Engine.trimPlan(fastClip,{ok:true,leading:.4,trailing:.2});
assert.equal(fastPlan.ok,true);
approx(fastPlan.sourceOffset,1.4,.001,'sourceOffset a 2x');
approx(fastPlan.duration,1.7,.001,'duración timeline a 2x');
approx(fastPlan.removedTimeline,.3,.001,'recorte timeline a 2x');
assert.equal(fastClip.start,3,'planificar no debe desplazar el clip');
Engine.applyPlan(fastClip,fastPlan);
approx(fastClip.sourceOffset,1.4,.001);approx(fastClip.duration,1.7,.001);
assert.equal(fastClip.start,3,'recortar silencio debe conservar el inicio en timeline');
assert.equal(fastClip.silenceTrim.version,1,'debe registrar metadatos del recorte');

const slowClip={duration:3,sourceOffset:.5,speed:.5};
const slowPlan=Engine.trimPlan(slowClip,{ok:true,leading:.1,trailing:.2});
assert.equal(slowPlan.ok,true);
approx(slowPlan.sourceOffset,.6,.001,'sourceOffset a 0.5x');
approx(slowPlan.duration,2.4,.001,'duración timeline a 0.5x');

const tiny=Engine.trimPlan({duration:.2,sourceOffset:0,speed:1},{ok:true,leading:.08,trailing:.08},{minTimelineDuration:.12});
assert.equal(tiny.ok,false);assert.equal(tiny.reason,'too-short');
const negligible=Engine.trimPlan({duration:1,sourceOffset:0,speed:1},{ok:true,leading:.01,trailing:.01});
assert.equal(negligible.ok,false);assert.equal(negligible.reason,'no-silence');

const win=Engine.clipWindow({duration:4,sourceOffset:8,speed:2},10);
approx(win.sourceDuration,2,.001,'ventana debe respetar final físico del asset');
assert.equal(win.speed,2);

assert.equal(Engine.canonicalTrack('04'),4,'acepta alias heredado 04');
assert.equal(Engine.canonicalTrack('4.0'),4,'acepta alias decimal entero');
assert.equal(Engine.canonicalTrack('06'),6,'acepta alias heredado 06');
assert.equal(Engine.canonicalTrack('6.5'),null,'no convierte pistas fraccionarias');
assert.equal(Engine.canonicalTrack(7),null,'no convierte pistas fuera del Studio');
assert.equal(Engine.canonicalTrack(' '),null,'no convierte pista vacía');
assert.equal(Engine.isAudioTrack('04'),true,'alias de voz debe ser pista de audio');
assert.equal(Engine.isAudioTrack('6.0'),true,'alias de efectos debe ser pista de audio');
assert.equal(Engine.isAudioTrack('4.5'),false,'alias inválido no debe ser audio');

assert.equal(Engine.hasAsset(0),true,'asset numérico 0 debe ser válido');
assert.equal(Engine.hasAsset(' 0 '),true,'asset string 0 debe ser válido');
assert.equal(Engine.hasAsset('   '),false,'asset vacío debe seguir inválido');
assert.equal(Engine.canonicalMediaId(' 07 '),'7','IDs numéricos heredados deben canonicalizar');
assert.equal(Engine.sameMediaId(7,' 07 '),true,'IDs equivalentes deben coincidir');
assert.equal(Engine.sameMediaId(0,'0'),true,'ID cero debe conservar identidad');
assert.equal(Engine.sameMediaId('',0),false,'ID vacío nunca debe coincidir');
const assets=[{id:0,type:'audio'},{id:7,type:'audio'},{id:'voice-A',type:'audio'}];
assert.equal(Engine.findAsset(assets,' 0 ')?.id,0,'debe resolver asset cero entre number/string');
assert.equal(Engine.findAsset(assets,'07')?.id,7,'debe resolver alias numérico de asset');
assert.equal(Engine.findAsset(assets,' voice-A ')?.id,'voice-A','IDs de texto ignoran espacios accidentales');
assert.equal(Engine.findAsset(assets,' '),null,'referencia vacía no debe resolver asset');

assert.equal(Engine.trackLocked({},4),false,'sin estado la pista es editable');
assert.equal(Engine.trackLocked({trackState:{4:{locked:true}}},4),true,'respeta lock moderno');
assert.equal(Engine.trackLocked({trackStates:{4:{locked:true}}},4),true,'respeta lock heredado');
assert.equal(Engine.trackLocked({trackState:{4:{locked:false}},trackStates:{4:{locked:true}}},4),true,'cualquier lock debe prevalecer');
assert.equal(Engine.trackLocked({trackState:{4:{locked:true}},trackStates:{4:{locked:false}}},4),true,'lock moderno no puede ser anulado por legacy');
assert.equal(Engine.trackLocked({trackState:{'05':{locked:true}}},5),true,'acepta alias heredado 05');
assert.equal(Engine.trackLocked({trackStates:{'6.0':{locked:true}}},'06'),true,'lock heredado 6.0 protege alias 06');
assert.equal(Engine.trackLocked({trackStates:{'04':{locked:true}}},4),true,'lock 04 protege pista canónica 4');
assert.equal(Engine.trackLocked({trackState:{'4.5':{locked:true}}},4),false,'alias fraccionario no contamina pista 4');
assert.equal(Engine.trackLocked({trackState:{7:{locked:true}}},6),false,'pista fuera de rango no contamina pista 6');
assert.equal(Engine.trackLocked({trackState:{4:{locked:true}}},5),false,'no bloquea otra pista');
assert.equal(Engine.trackLocked({trackState:{4:{locked:true}}},'invalid'),false,'track inválido no debe bloquear por accidente');

const integration=readFileSync(new URL('./audio-silence-integration.js',import.meta.url),'utf8');
assert.match(integration,/Engine\.hasAsset\(clip\.asset\)/,'integración debe aceptar asset 0 con helper explícito');
assert.match(integration,/Engine\.findAsset\(assets,clip\.asset\)/,'integración debe resolver identidad canónica de medios');
assert.match(integration,/!!clip\?\.locked/,'integración debe respetar lock individual del clip');
assert.match(integration,/Engine\.canonicalTrack\(c\?\.track\)===4/,'limpieza masiva debe reconocer aliases válidos de voz');
assert.doesNotMatch(integration,/!clip\.asset/,'integración no debe volver a rechazar asset 0 por truthiness');
assert.doesNotMatch(integration,/a\.id===clip\.asset/,'integración no debe volver a igualdad estricta de medios');

console.log('Audio silence trim regression OK');
