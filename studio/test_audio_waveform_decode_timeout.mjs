import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

let decodeMode='hang';
class FakeAudioContext{
  decodeAudioData(){
    if(decodeMode==='hang') return new Promise(()=>{});
    return Promise.resolve({duration:3.5});
  }
}

const head={appendChild(){}};
const document={
  head,
  createElement(tag){return {tagName:tag.toUpperCase(),style:{},dataset:{},setAttribute(){},appendChild(){},querySelector(){return null}}},
  querySelectorAll(){return []},
  addEventListener(){}
};
const Engine={
  canonicalMediaId(id){if(id===null||id===undefined||String(id).trim()==='')return null;return String(Number(String(id).trim()))},
  buildPeaks(){return Float32Array.from([0,.5,1])},
  findById(){return null},isAudioTrack(){return false},hasAsset(){return false},slicePeaks(){return []},drawable(v){return v}
};
const window={
  ProfitMenteAudioWaveformEngine:Engine,
  ProfitMenteWaveformDecodeTimeoutMs:15,
  AudioContext:FakeAudioContext,
  devicePixelRatio:1,
  addEventListener(){}
};
const context={window,document,console:{warn(){},log(){}},setTimeout,clearTimeout,queueMicrotask,Promise,Array,Math,Number,Float32Array};
vm.createContext(context);
vm.runInContext(fs.readFileSync(new URL('./audio-waveform-integration.js',import.meta.url),'utf8'),context,{filename:'audio-waveform-integration.js'});

const api=window.ProfitMenteAudioWaveforms;
assert.ok(api,'la integración debe inicializarse');
assert.equal(typeof api.decodeAsset,'function');
const asset={id:0,name:'voice.wav',blob:{size:4,type:'audio/wav',arrayBuffer:async()=>new ArrayBuffer(4)}};
const started=Date.now();
const stalled=await api.decodeAsset(asset);
const elapsed=Date.now()-started;
assert.equal(stalled,null,'un decoder colgado debe fallar seguro');
assert.ok(elapsed<500,'el watchdog debe impedir un bloqueo indefinido');
await new Promise(resolve=>setTimeout(resolve,0));
assert.equal(api.cache.size,0,'un timeout no debe quedar cacheado para siempre');

decodeMode='ok';
const recovered=await api.decodeAsset(asset);
assert.equal(recovered.duration,3.5,'el mismo medio debe poder reintentarse');
assert.deepEqual(Array.from(recovered.peaks),[0,.5,1]);
assert.equal(api.cache.size,1,'una decodificación válida sí debe quedar cacheada');

console.log('audio waveform decode timeout regression: ok');
