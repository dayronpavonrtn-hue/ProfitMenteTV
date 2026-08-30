import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {ProfitMenteTrackMixerEngine:E}=require('./track-mixer-engine.js');

const state={'5':{muted:false,solo:true,gain:1.25},6:{gain:-4}};
E.ensure(state);
assert.equal(E.gain(state,4),1);
assert.equal(E.gain(state,5),1.25);
assert.equal(E.gain(state,6),0);
assert.equal(state[5].solo,true,'ensure must preserve Solo state');
assert.equal(E.setGain(state,4,3),2);
assert.equal(E.setGain(state,5,.35),.35);
assert.equal(E.setGain(state,2,.5),null);
assert.equal(E.percent(.35),'35%');
assert.equal(E.effectiveVolume({trackState:state},{track:5},.8),.28);
assert.equal(E.effectiveVolume({trackState:state},{track:2},.8),.8);

const bundleCalls=[];
class Bundle{renderLocal(project,assets,onStatus){bundleCalls.push({project,assets,onStatus});return Promise.resolve(123)}}
const context={window:{ProfitMenteTrackMixerEngine:E,ProfitMenteBundleEngine:Bundle},structuredClone,console};
context.globalThis=context.window;
vm.createContext(context);
vm.runInContext(fs.readFileSync(new URL('./track-mixer-render-integration.js',import.meta.url),'utf8'),context);
const project={trackState:{4:{gain:.5,muted:false},5:{gain:2},6:{gain:1.5,solo:true}},clips:[
  {id:'sfx',track:4,volume:.8},{id:'music',track:5},{id:'voice',track:6,volume:.4},{id:'video',track:0,volume:.7}
]};
const baked=context.window.ProfitMenteTrackMixerRender.bake(project);
assert.equal(baked.clips[0].volume,.4);
assert.equal(baked.clips[1].volume,.44);
assert.ok(Math.abs(baked.clips[2].volume-.6)<1e-12);
assert.equal(baked.clips[3].volume,.7);
assert.equal(baked.trackState[4].gain,1);
assert.equal(baked.trackState[5].gain,1);
assert.equal(baked.trackState[6].gain,1);
assert.equal(baked.trackState[6].solo,true,'render baking must preserve non-gain track state');
assert.equal(project.trackState[5].gain,2,'render baking must not mutate the editor project');
assert.equal(project.clips[1].volume,undefined,'render baking must not mutate clip volume');
assert.equal(baked.renderMix.trackGainBaked,true);
await new Bundle().renderLocal(project,[],()=>{});
assert.equal(bundleCalls.length,1);
assert.equal(bundleCalls[0].project.clips[1].volume,.44,'patched MP4 render must receive baked levels');

const bootstrap=fs.readFileSync(new URL('./feature-bootstrap.js',import.meta.url),'utf8');
const audio=fs.readFileSync(new URL('./audio-engine.js',import.meta.url),'utf8');
assert.ok(bootstrap.indexOf('track-mixer-engine.js')<bootstrap.indexOf('track-mixer-integration.js'));
assert.ok(bootstrap.indexOf('track-mixer-integration.js')<bootstrap.indexOf('track-mixer-render-integration.js'));
assert.match(audio,/syncTrackGains\(project\)/);
assert.match(audio,/duck\.connect\(this\.trackGains/);
assert.match(audio,/setTrackGain\(track,value\)/);
console.log('track mixer tests passed');
