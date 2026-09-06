import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {ProfitMenteAudioEnvelopeEngine}=require('./audio-envelope-engine.js');
const engine=new ProfitMenteAudioEnvelopeEngine();

assert.equal(engine.canonicalTrack('04'),4,'acepta alias 04');
assert.equal(engine.canonicalTrack('4.0'),4,'acepta decimal entero');
assert.equal(engine.canonicalTrack('06'),6,'acepta alias 06');
assert.equal(engine.canonicalTrack('-0'),0,'normaliza negative zero');
assert.equal(engine.canonicalTrack(false),null,'rechaza false como pista 0');
assert.equal(engine.canonicalTrack(true),null,'rechaza true como pista 1');
assert.equal(engine.canonicalTrack('6.5'),null,'rechaza pista fraccionaria');
assert.equal(engine.canonicalTrack(7),null,'rechaza pista fuera de rango');
assert.equal(engine.canonicalTrack(' '),null,'rechaza pista vacía');

assert.equal(engine.hasAsset(0),true,'asset 0 debe ser válido');
assert.equal(engine.hasAsset(' 0 '),true,'asset string 0 debe ser válido');
assert.equal(engine.hasAsset(false),false,'boolean no puede ser asset');
assert.equal(engine.hasAsset(true),false,'boolean true no puede ser asset');
assert.equal(engine.hasAsset({id:7}),false,'objeto no puede convertirse en ID textual');
assert.equal(engine.hasAsset(' '),false,'asset vacío debe ser inválido');
assert.equal(engine.sameId(7,' 07 '),true,'IDs numéricos equivalentes deben coincidir');
assert.equal(engine.sameId(-0,'-0'),true,'negative zero debe equivaler a cero');
assert.equal(engine.sameId('voice-A',' voice-A '),true,'IDs de texto toleran espacios accidentales');
assert.equal(engine.sameId('',0),false,'ID vacío nunca coincide');
assert.equal(engine.sameId(false,0),false,'boolean false nunca coincide con asset 0');
const assets=[{id:0,type:'audio'},{id:7,type:'video'},{id:'voice-A',type:'audio'}];
assert.equal(engine.findAsset(assets,'0')?.id,0,'resuelve asset cero');
assert.equal(engine.findAsset(assets,' 07 ')?.id,7,'resuelve alias numérico');
assert.equal(engine.findAsset(assets,false),null,'no resuelve boolean como asset cero');

assert.equal(engine.trackLocked({trackState:{'04':{locked:true}}},4),true,'lock 04 protege pista 4');
assert.equal(engine.trackLocked({trackStates:{'6.0':{locked:true}}},'06'),true,'lock legacy 6.0 protege 06');
assert.equal(engine.trackLocked({trackState:{false:{locked:true}}},0),false,'clave booleana textual no contamina pista 0');
assert.equal(engine.trackLocked({trackState:{'4.5':{locked:true}}},4),false,'alias inválido no contamina pista 4');
assert.equal(engine.trackLocked({trackState:{7:{locked:true}}},6),false,'pista 7 no contamina pista 6');
assert.equal(engine.clipLocked({}, {track:4,locked:true}),true,'respeta lock individual del clip');
assert.equal(engine.clipLocked({trackStates:{'05':{locked:true}}},{track:5}),true,'respeta lock heredado de pista');

assert.equal(engine.isAudioEligible({track:'04',asset:0},assets),true,'audio asset 0 es elegible');
assert.equal(engine.isAudioEligible({track:'01',asset:'07'},assets),true,'video con audio en pista visual es elegible');
assert.equal(engine.isAudioEligible({track:false,asset:0},assets),false,'boolean false no puede representar pista visual 0');
assert.equal(engine.isAudioEligible({track:'04',asset:false},assets),false,'boolean false no puede representar asset 0');
assert.equal(engine.isAudioEligible({track:'02',asset:'07'},assets),false,'overlay visual no expone envolvente de audio');
assert.equal(engine.isAudioEligible({track:'6.5',asset:0},assets),false,'pista inválida no es elegible');
assert.equal(engine.isAudioEligible({track:4,asset:' '},assets),false,'asset vacío no es elegible');

let e=engine.normalize(1,.8,.8);
assert.ok(Math.abs(e.fadeIn-.5)<.001&&Math.abs(e.fadeOut-.5)<.001,'fades deben caber dentro del clip');
e=engine.normalize(2,-1,5);
assert.equal(e.fadeIn,0);assert.equal(e.fadeOut,2);
const clip={id:0,track:'04',asset:0,duration:2};
let r=engine.apply({},clip,.25,.35);
assert.equal(r.ok,true);assert.equal(clip.fadeIn,.25);assert.equal(clip.fadeOut,.35);
r=engine.apply({trackState:{'04':{locked:true}}},clip,.1,.1);
assert.equal(r.ok,false);assert.equal(r.reason,'locked');assert.equal(clip.fadeIn,.25,'rechazo por lock debe ser atómico');
clip.locked=true;r=engine.apply({},clip,.1,.1);
assert.equal(r.ok,false);assert.equal(clip.fadeOut,.35,'lock individual no modifica el clip');
clip.locked=false;
assert.ok(Math.abs(engine.gainAt(clip,0)-0)<.001,'fade-in empieza en silencio');
assert.ok(engine.gainAt(clip,.125)>.45&&engine.gainAt(clip,.125)<.55,'fade-in interpola ganancia');
assert.ok(Math.abs(engine.gainAt(clip,1)-1)<.001,'centro conserva ganancia completa');
assert.ok(Math.abs(engine.gainAt(clip,2)-0)<.001,'fade-out termina en silencio');

const integration=readFileSync(new URL('./audio-envelope-integration.js',import.meta.url),'utf8');
const html=readFileSync(new URL('./index.html',import.meta.url),'utf8');
assert.match(integration,/engine\.sameId\(c\?\.id,selected\(\)\)/,'selección debe tolerar IDs number/string');
assert.match(integration,/engine\.isAudioEligible\(c,assets\)/,'elegibilidad debe usar identidad canónica');
assert.match(integration,/engine\.clipLocked\(project,c\)/,'UI debe respetar lock individual y de pista');
assert.doesNotMatch(integration,/!c\?\.asset/,'no debe rechazar asset 0 por truthiness');
assert.doesNotMatch(integration,/x=>x\.id===c\.asset/,'no debe volver a igualdad estricta de medios');
assert.match(html,/audio-envelope-engine\.js/,'index debe cargar el motor');
assert.match(html,/audio-envelope-integration\.js/,'index debe cargar la integración');

console.log('Audio envelope regression OK');