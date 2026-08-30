import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {ProfitMenteTrackSoloEngine:Solo}=require('./track-controls.js');

const fresh=()=>Solo.ensure({});

{
  const s=fresh();
  assert.equal(Solo.toggleSolo(s,0),true);
  assert.equal(s[0].hidden,false,'la pista visual en Solo debe seguir visible');
  assert.equal(s[1].hidden,true,'otra pista visual debe ocultarse por Solo');
  assert.equal(s[2].hidden,true);
  assert.equal(s[3].hidden,true);
  assert.equal(s[4].muted,false,'Solo visual no debe afectar audio');
  assert.equal(s[5].muted,false);
  assert.equal(s[6].muted,false);

  Solo.toggleSolo(s,1);
  assert.equal(s[0].hidden,false,'varias pistas visuales en Solo deben convivir');
  assert.equal(s[1].hidden,false);
  assert.equal(s[2].hidden,true);
  assert.equal(s[3].hidden,true);

  Solo.toggleSolo(s,0);
  assert.equal(s[0].hidden,true,'al quitar Solo de una pista, otra pista Solo debe seguir aislando');
  assert.equal(s[1].hidden,false);
  Solo.toggleSolo(s,1);
  for(const i of [0,1,2,3])assert.equal(s[i].hidden,false,'al quitar el último Solo debe restaurarse la visibilidad base');
}

{
  const s=fresh();
  s[1].hidden=true;
  Solo.toggleSolo(s,0);
  assert.equal(s[1].hidden,true,'una pista ya oculta debe permanecer oculta durante Solo');
  Solo.toggleSolo(s,0);
  assert.equal(s[1].hidden,true,'Solo debe restaurar el ocultamiento manual anterior');
  assert.equal(s[2].hidden,false);

  Solo.toggleSolo(s,0);
  Solo.toggleHidden(s,2);
  assert.equal(Solo.baseHidden(s[2]),true,'ocultar durante Solo debe modificar el estado base');
  assert.equal(s[2].hidden,true);
  Solo.toggleSolo(s,0);
  assert.equal(s[2].hidden,true,'el ocultamiento hecho durante Solo debe sobrevivir al salir de Solo');
}

{
  const s=fresh();
  s[5].muted=true;
  Solo.toggleSolo(s,6);
  assert.equal(s[4].muted,true,'Solo de voz debe silenciar otros audios');
  assert.equal(s[5].muted,true,'un mute manual previo debe conservarse');
  assert.equal(s[6].muted,false,'la pista de audio en Solo debe quedar audible');
  assert.equal(s[0].hidden,false,'Solo de audio no debe afectar pistas visuales');

  Solo.toggleMuted(s,4);
  assert.equal(Solo.baseMuted(s[4]),true,'mute durante Solo debe actualizar el estado base');
  Solo.toggleSolo(s,6);
  assert.equal(s[4].muted,true,'el mute hecho durante Solo debe sobrevivir al salir');
  assert.equal(s[5].muted,true,'el mute anterior debe restaurarse');
  assert.equal(s[6].muted,false);
}

{
  const s=fresh();
  Solo.toggleSolo(s,0);
  Solo.toggleSolo(s,6);
  assert.equal(s[1].hidden,true,'Solo visual debe seguir activo junto con Solo de audio');
  assert.equal(s[5].muted,true,'Solo de audio debe seguir activo junto con Solo visual');
  const restored=JSON.parse(JSON.stringify(s));
  Solo.apply(restored);
  assert.equal(restored[1].hidden,true,'el estado Solo debe sobrevivir persistencia/recarga');
  assert.equal(restored[5].muted,true);
  Solo.toggleSolo(restored,0);
  assert.equal(restored[1].hidden,false,'al quitar Solo visual tras recarga debe restaurar base');
  assert.equal(restored[5].muted,true,'Solo de audio debe permanecer independiente');
  Solo.toggleSolo(restored,6);
  assert.equal(restored[5].muted,false);
}

console.log('Track Solo regression OK');
