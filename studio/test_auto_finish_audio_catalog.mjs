import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const Engine=require('./auto-finish-engine.js');

const project={clips:[
  {track:0,asset:'visual',sceneText:'Escena A'},
  {track:0,asset:'visual',sceneText:'Escena B'},
  {track:5,asset:'missing-music'},
  {track:6,asset:'voice'}
],markers:[],trackState:{}};

const catalog=[
  {id:'visual',type:'image'},
  {id:'voice',type:'audio'}
];
const inspected=Engine.inspect(project,catalog);
assert.equal(inspected.voice,1);
assert.equal(inspected.music,0,'audio ausente del catálogo no debe activar Smart Mix ni headroom como música válida');
assert.deepEqual(Engine.plan(project,catalog).steps,['repair','fill-visual-gaps','detect-beats','sync-beats','auto-transitions','audio-headroom','qa']);

const wrongType=Engine.inspect({...project,clips:[{track:5,asset:'visual'}]},catalog);
assert.equal(wrongType.music,0,'un asset visual no debe contar como audio aunque comparta ID');

const legacyProject={clips:[{track:5,asset:'007'},{track:6,asset:8}],markers:[],trackState:{}};
const legacyCatalog=[{id:7,type:'audio'},{id:'008.0',type:'audio'}];
assert.equal(Engine.inspect(legacyProject,legacyCatalog).music,1);
assert.equal(Engine.inspect(legacyProject,legacyCatalog).voice,1);
assert.deepEqual(Engine.plan(legacyProject,legacyCatalog).steps,['repair','smart-mix','detect-beats','audio-headroom','qa']);

const noCatalog={clips:[{track:5,asset:'legacy-external'}],markers:[],trackState:{}};
assert.equal(Engine.inspect(noCatalog,[]).music,1,'sin catálogo se conserva compatibilidad legacy');

console.log('auto-finish audio catalog regression: ok');
