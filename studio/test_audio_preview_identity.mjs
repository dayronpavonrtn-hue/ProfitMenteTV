import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { ProfitMenteAudioEngine } = require('./audio-engine.js');

const engine = new ProfitMenteAudioEngine();

assert.equal(engine.canonicalMediaId(0), '0');
assert.equal(engine.canonicalMediaId('0'), '0');
assert.equal(engine.canonicalMediaId(' 7 '), '7');
assert.equal(engine.canonicalMediaId(7), '7');
assert.equal(engine.canonicalMediaId(''), null);
assert.equal(engine.canonicalMediaId('   '), null);
assert.equal(engine.mediaAssigned(0), true);
assert.equal(engine.mediaAssigned(' 0 '), true);
assert.equal(engine.mediaAssigned(''), false);
assert.equal(engine.mediaAssigned(null), false);

const assets = [
  { id: 0, type: 'audio', name: 'zero.wav' },
  { id: 7, type: 'audio', name: 'seven.wav' },
  { id: 'hero', type: 'video', name: 'hero.mp4' },
];
assert.equal(engine.findAsset(assets, '0')?.name, 'zero.wav');
assert.equal(engine.findAsset(assets, ' 7 ')?.name, 'seven.wav');
assert.equal(engine.findAsset(assets, 'hero')?.name, 'hero.mp4');
assert.equal(engine.findAsset(assets, ''), null);

assert.equal(engine.canonicalTrack('00'), 0);
assert.equal(engine.canonicalTrack('1.0'), 1);
assert.equal(engine.canonicalTrack('06'), 6);
assert.equal(engine.canonicalTrack('1.5'), null);
assert.equal(engine.canonicalTrack(7), null);

const legacyProject = {
  trackStates: {
    '04': { gain: 0.4 },
    '05.0': { gain: 0.25 },
    '00': { hidden: true },
  },
};
assert.equal(engine.trackGainValue(legacyProject, 4), 0.4);
assert.equal(engine.trackGainValue(legacyProject, '5'), 0.25);
assert.equal(engine.visualTrackHidden(legacyProject, 0), true);
assert.equal(engine.visualTrackHidden(legacyProject, '0.0'), true);

const modernProject = {
  trackState: {
    4: { gain: 1.7 },
    1: { hidden: true },
  },
  trackStates: {
    '04': { gain: 0.2 },
    '01': { hidden: false },
  },
};
assert.equal(engine.trackGainValue(modernProject, 4), 1.7, 'trackState should win over legacy trackStates');
assert.equal(engine.visualTrackHidden(modernProject, 1), true, 'modern hidden state should win over legacy alias');

assert.equal(engine.trackGainValue({ trackStates: { '04': { gain: 9 } } }, 4), 2, 'gain must remain clamped');
assert.equal(engine.trackGainValue({ trackStates: { '04': { gain: -3 } } }, 4), 0, 'gain must remain clamped');
assert.equal(engine.trackGainValue({ trackStates: { '04': { gain: true } } }, 4), 1, 'boolean gain must not coerce to 1 as user data');
assert.equal(engine.trackGainValue({ trackStates: { '04': { gain: false } } }, 4), 1, 'boolean gain must fall back safely');
assert.equal(engine.trackGainValue({ trackStates: { '04': { gain: {} } } }, 4), 1, 'object gain must fall back safely');
assert.equal(engine.trackGainValue({ trackStates: { '04': { gain: ' 0.35 ' } } }, 4), 0.35, 'legacy numeric string gain remains supported');
assert.equal(engine.finiteNumber(NaN), null);
assert.equal(engine.finiteNumber(Infinity), null);
assert.equal(engine.finiteNumber(''), null);
assert.equal(engine.finiteNumber(true), null);

function makeScheduleEngine(){
  const e=new ProfitMenteAudioEngine(),starts=[];
  e.init=()=>{};
  e.syncTrackGains=()=>{};
  e.monitor={gain:{value:1}};
  e.master={};
  e.trackGains={4:{},5:{},6:{}};
  e.ctx={
    currentTime:0,
    resume:async()=>{},
    createBufferSource(){return {buffer:null,playbackRate:{value:1},connect(){},start(...args){starts.push(args)},stop(){}}},
    createGain(){return {gain:{value:1,cancelScheduledValues(){},setValueAtTime(){},linearRampToValueAtTime(){}},connect(){}}},
  };
  return {e,starts};
}

{
  const {e,starts}=makeScheduleEngine();
  e.buffer=async()=>{e.ctx.currentTime+=0.2;return {duration:10}};
  const project={clips:[
    {id:'a',track:4,asset:'one',start:0,duration:2,volume:1},
    {id:'b',track:4,asset:'two',start:1,duration:2,volume:1},
  ]};
  const media=[{id:'one',type:'audio',name:'one.wav',blob:{}},{id:'two',type:'audio',name:'two.wav',blob:{}}];
  assert.equal(await e.schedule(project,media,0,false),true);
  assert.equal(starts.length,2);
  assert.ok(starts[0][0]>=0.45,'el primer clip debe anclarse después de terminar todas las decodificaciones');
  assert.ok(Math.abs((starts[1][0]-starts[0][0])-1)<1e-9,'los clips deben conservar su separación de timeline con un ancla común');
}

{
  const {e,starts}=makeScheduleEngine();
  let release;
  e.buffer=()=>new Promise(resolve=>{release=resolve});
  const pending=e.schedule({clips:[{track:4,asset:'slow',start:0,duration:1}]},[{id:'slow',type:'audio',name:'slow.wav',blob:{}}],0,false);
  await Promise.resolve();
  e.stop();
  release({duration:10});
  assert.equal(await pending,false,'una programación reemplazada durante decode debe abortarse');
  assert.equal(starts.length,0,'una programación obsoleta no debe iniciar nodos de audio');
}

console.log('audio preview identity + decode-safe scheduling regression: PASS');
