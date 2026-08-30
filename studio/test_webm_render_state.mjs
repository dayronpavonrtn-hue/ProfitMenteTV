import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import fs from 'node:fs';
const require=createRequire(import.meta.url);
const Engine=require('./webm-render-engine.js');

const project={name:'Proyecto A',duration:2,format:'9:16',clips:[{id:'c1',track:0,start:0,duration:2,asset:'a1'}]};
const assets=[{id:'a1',name:'video.mp4',type:'video',mime:'video/mp4',blob:{size:1200,type:'video/mp4',lastModified:10}}];
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

const integration=fs.readFileSync(new URL('./webm-render-integration.js',import.meta.url),'utf8');
assert.match(integration,/captureState\(renderProject,assets\)/,'la integración debe capturar el estado después de guardar');
assert.match(integration,/assertState\(renderState,project,assets\)/,'la integración debe validar el estado durante el render');
assert.match(integration,/download\(blob,renderName\)/,'la descarga debe conservar el nombre capturado al iniciar');
assert.match(integration,/WEBM_STATE_CHANGED/,'la UI debe distinguir cambios de proyecto de una cancelación normal');
assert.match(integration,/project===renderProject\?previousTime/,'cleanup no debe imponer el playhead anterior sobre otro proyecto');

console.log('WebM render state QA: OK');
