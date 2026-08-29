import assert from 'node:assert/strict';
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

console.log('Audio silence trim regression OK');
