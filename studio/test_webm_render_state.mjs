import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import fs from 'node:fs';
const require=createRequire(import.meta.url);
const Engine=require('./webm-render-engine.js');

assert.equal(Engine.normalizeQuality('draft'),'draft');
assert.equal(Engine.normalizeQuality('STANDARD'),'standard');
assert.equal(Engine.normalizeQuality('unknown'),'high','calidad inválida debe caer en alta');
assert.equal(Engine.normalizeDuration(true),0,'booleanos no deben convertirse en duración');
assert.equal(Engine.normalizeDuration({valueOf(){return 2}}),0,'objetos coercibles no deben convertirse en duración');
assert.equal(Engine.normalizeDuration('2.5'),2.5,'cadenas numéricas válidas deben conservar compatibilidad');
assert.equal(Engine.normalizeFps(true),30,'booleanos no deben convertirse en FPS');
assert.equal(Engine.normalizeFps({valueOf(){return 24}}),30,'objetos coercibles no deben convertirse en FPS');
assert.equal(Engine.normalizeFps('24'),24,'cadenas numéricas válidas deben conservar compatibilidad');
const guardedDims=Engine.recorderOptions({mimeType:'video/webm',quality:'high',width:true,height:{valueOf(){return 1}},fps:true});
assert.equal(guardedDims.videoBitsPerSecond,10000000,'dimensiones/FPS corruptos deben caer a 1080x1920@30');
const high1080=Engine.recorderOptions({mimeType:'video/webm',quality:'high',width:1080,height:1920,fps:30});
assert.deepEqual(high1080,{mimeType:'video/webm',videoBitsPerSecond:10000000,audioBitsPerSecond:192000},'alta 1080p30 debe usar bitrate final');
const standard1080=Engine.recorderOptions({mimeType:'video/webm',quality:'standard',width:1080,height:1920,fps:30});
assert.equal(standard1080.videoBitsPerSecond,6000000,'estándar debe reducir bitrate sin cambiar resolución');
assert.equal(standard1080.audioBitsPerSecond,160000,'estándar debe mantener audio de calidad suficiente');
const draftSmall=Engine.recorderOptions({mimeType:'video/webm',quality:'draft',width:320,height:180,fps:24});
assert.equal(draftSmall.videoBitsPerSecond,1050000,'borrador pequeño debe respetar el piso de escala antes del clamp de bitrate');
assert.equal(draftSmall.audioBitsPerSecond,128000);
const high4k60=Engine.recorderOptions({mimeType:'video/webm',quality:'high',width:2160,height:3840,fps:60});
assert.equal(high4k60.videoBitsPerSecond,20000000,'alta 4K60 debe quedar limitada a 20 Mbps para un render local razonable');
const guardedPlan=Engine.framePlan(true,true);
assert.equal(guardedPlan.duration,0,'framePlan debe rechazar duración booleana');
assert.equal(guardedPlan.fps,30,'framePlan debe rechazar FPS booleano');
assert.equal(guardedPlan.timeAt({valueOf(){return 5}}),0,'índices coercibles no deben mover el frame plan');

const project={name:'Proyecto A',duration:2,format:'9:16',renderQuality:'high',clips:[{id:'c1',track:0,start:0,duration:2,asset:'a1'}]};
const assets=[{id:'a1',name:'video.mp4',type:'video',mime:'video/mp4',duration:2,width:1080,height:1920,mediaReadable:true,metadataVersion:2,sourceFingerprint:'video.mp4|1200|video/mp4|10',sourceContentHash:'hash-a',sourceLegacyContentHash:'legacy-a',sourceHashVersion:'sample-v2',blob:{size:1200,type:'video/mp4',lastModified:10}}];
const snapshot=Engine.captureState(project,assets);
assert.equal(Engine.assertState(snapshot,project,assets),true,'el estado inicial debe ser válido');

project.clips[0].start=.25;
assert.throws(()=>Engine.assertState(snapshot,project,assets),err=>err?.code==='WEBM_STATE_CHANGED','una edición de timeline debe invalidar el render');
project.clips[0].start=0;
assert.equal(Engine.assertState(snapshot,project,assets),true,'restaurar el estado debe volver a coincidir');

const switched={...project,clips:project.clips.map(c=>({...c}))};
assert.throws(()=>Engine.assertState(snapshot,switched,assets),err=>err?.code==='WEBM_STATE_CHANGED','cambiar de objeto proyecto debe invalidar el render aunque el JSON coincida');

assets[0].blob={size:2400,type:'video/mp4',lastModified:20};
assert.throws(()=>Engine.assertState(snapshot,project,assets),err=>err?.code==='WEBM_STATE_CHANGED','reemplazar un medio debe invalidar el render');
assets[0].blob={size:1200,type:'video/mp4',lastModified:10};
assert.equal(Engine.assertState(snapshot,project,assets),true,'restaurar el blob debe volver a coincidir');

assets[0].duration=1.5;
assert.throws(()=>Engine.assertState(snapshot,project,assets),err=>err?.code==='WEBM_STATE_CHANGED','cambiar la duración inspeccionada debe invalidar el render');
assets[0].duration=2;
assets[0].mediaReadable=false;
assert.throws(()=>Engine.assertState(snapshot,project,assets),err=>err?.code==='WEBM_STATE_CHANGED','un medio que pasa a no legible debe invalidar el render');
assets[0].mediaReadable=true;
assets[0].sourceContentHash='hash-b';
assert.throws(()=>Engine.assertState(snapshot,project,assets),err=>err?.code==='WEBM_STATE_CHANGED','cambiar la identidad de contenido debe invalidar el render aunque tamaño y nombre coincidan');
assets[0].sourceContentHash='hash-a';
assets[0].width=720;
assert.throws(()=>Engine.assertState(snapshot,project,assets),err=>err?.code==='WEBM_STATE_CHANGED','cambiar dimensiones inspeccionadas debe invalidar el render');
assets[0].width=1080;
assert.equal(Engine.assertState(snapshot,project,assets),true,'restaurar todos los metadatos debe volver a coincidir');

const integration=fs.readFileSync(new URL('./webm-render-integration.js',import.meta.url),'utf8');
assert.match(integration,/captureState\(renderProject,assets\)/,'la integración debe capturar el estado después de guardar');
assert.match(integration,/assertState\(renderState,project,assets\)/,'la integración debe validar el estado durante el render');
assert.match(integration,/ProfitMentePreviewFormatEngine\.exportDimensions\(format\)/,'WebM debe usar las dimensiones finales de exportación, no las reducidas del monitor');
assert.match(integration,/canvas\.width=next\.width;canvas\.height=next\.height/,'el canvas debe pasar a resolución final antes de capturar el stream');
assert.match(integration,/const exportSize=applyExportDimensions\(renderProject\)/,'la resolución final debe aplicarse antes de configurar MediaRecorder');
assert.match(integration,/recorderOptions\(\{mimeType:mime,quality:renderQuality,width:exportSize\.width,height:exportSize\.height,fps:plan\.fps\}\)/,'WebM debe derivar bitrate de calidad, resolución final y FPS');
assert.match(integration,/new MediaRecorder\(mixedStream,recorderOptions\)/,'MediaRecorder debe recibir el preset de bitrate calculado');
assert.match(integration,/captureStream\(plan\.fps\)/,'el stream debe capturarse después de aplicar la resolución final');
assert.match(integration,/applyQuality\(monitorQuality\)/,'cleanup debe restaurar la calidad de preview elegida por el usuario');
assert.match(integration,/download\(blob,renderName\)/,'la descarga debe conservar el nombre capturado al iniciar');
assert.match(integration,/WEBM_STATE_CHANGED/,'la UI debe distinguir cambios de proyecto de una cancelación normal');
assert.match(integration,/project===renderProject\?previousTime/,'cleanup no debe imponer el playhead anterior sobre otro proyecto');

console.log('WebM render state + quality + final resolution + numeric guard QA: OK');