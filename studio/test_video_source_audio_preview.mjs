import {createRequire} from 'module';
const require=createRequire(import.meta.url);
const {ProfitMenteAudioEngine}=require('./audio-engine.js');

const calls=[];
const param=()=>({value:0,events:[],cancelScheduledValues(t){this.events.push(['cancel',t])},setValueAtTime(v,t){this.events.push(['set',v,t]);this.value=v},linearRampToValueAtTime(v,t){this.events.push(['ramp',v,t]);this.value=v}});
const gains=[];
const ctx={
  currentTime:10,
  resume:async()=>{},
  createGain(){const n={gain:param(),connect(){}};gains.push(n);return n},
  createBufferSource(){return {buffer:null,playbackRate:{value:1},connect(){},start(...args){calls.push({kind:'start',args,speed:this.playbackRate.value})},stop(){}}}
};
function engine(){const e=new ProfitMenteAudioEngine();e.ctx=ctx;e.master={};e.monitor={gain:{value:1}};e.trackGains={};e.syncTrackGains=()=>{};e.buffer=async()=>({duration:20});return e}
const assets=[{id:'v1',type:'video',name:'source.mp4',blob:{}}];
const base={track:0,asset:'v1',start:2,duration:4,sourceOffset:1,speed:1.5,sourceVolume:.6,fadeIn:.5,fadeOut:.5};

calls.length=0;gains.length=0;
await engine().schedule({clips:[base],trackState:{}},assets,3,true);
if(calls.length!==1)throw new Error(`expected one source-audio start, got ${calls.length}`);
const [at,offset,duration]=calls[0].args;
if(Math.abs(at-10.05)>.001)throw new Error(`unexpected audio start time ${at}`);
if(Math.abs(offset-2.5)>.001)throw new Error(`sourceOffset/speed parity failed: ${offset}`);
if(Math.abs(duration-4.5)>.001)throw new Error(`source duration parity failed: ${duration}`);
if(Math.abs(calls[0].speed-1.5)>.001)throw new Error('video source playback speed not applied');
if(!gains.some(g=>g.gain.events.some(e=>e[0]==='set'&&Math.abs(e[1]-.6)<.001)))throw new Error('sourceVolume was not scheduled');

calls.length=0;
await engine().schedule({clips:[{...base,muted:true}],trackState:{}},assets,0,true);
if(calls.length)throw new Error('muted video source audio was scheduled');

calls.length=0;
await engine().schedule({clips:[base],trackState:{0:{hidden:true}}},assets,0,true);
if(calls.length)throw new Error('hidden visual track source audio was scheduled');

calls.length=0;
await engine().schedule({clips:[{...base,track:2}],trackState:{}},assets,0,true);
if(calls.length)throw new Error('Motion track must not be treated as source video audio');

console.log('Video source audio preview parity OK');
