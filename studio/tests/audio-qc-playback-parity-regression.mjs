import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require=createRequire(import.meta.url);
const {ProfitMenteAudioEngine}=require('../audio-engine.js');
const engine=new ProfitMenteAudioEngine();

const asset='media-1';
const clip=(track,extra={})=>({id:`clip-${track}`,track,asset,start:0,duration:2,...extra});
const project=(clips,trackStates={},trackState=undefined)=>({clips,trackStates,...(trackState?{trackState}:{})});

const music=clip(4);
assert.equal(engine.clipAudible(project([music]),music),true,'normal audio clip should be audible');
assert.equal(engine.clipAudible(project([clip(4,{muted:true})]),clip(4,{muted:true})),false,'strict clip muted=true must silence audio');
assert.equal(engine.clipAudible(project([clip(4,{muted:'false'})]),clip(4,{muted:'false'})),true,'string false must not mute audio');
assert.equal(engine.clipAudible(project([clip(4,{muted:1})]),clip(4,{muted:1})),true,'numeric truthy values must not mute audio');
assert.equal(engine.clipAudible(project([music],{'4':{muted:true}}),music),false,'strict track muted=true must silence audio');
assert.equal(engine.clipAudible(project([music],{'04':{muted:'false'}}),music),true,'legacy alias string false must not mute audio');

const voice=clip(5);
assert.equal(engine.clipAudible(project([music,voice],{'5':{solo:true}}),music),false,'audio solo must silence non-solo tracks');
assert.equal(engine.clipAudible(project([music,voice],{'5':{solo:true}}),voice),true,'audio solo track must remain audible');

const video=clip(0);
assert.equal(engine.clipAudible(project([video],{'0':{hidden:true}}),video),false,'hidden visual track must not contribute source audio');
assert.equal(engine.clipAudible(project([video],{'0':{hidden:'false'}}),video),true,'string false must not hide visual track source audio');

const effects=clip(6);
assert.equal(engine.clipAudible(project([effects],{}, {'06':{muted:true}}),effects),false,'legacy trackState aliases must preserve strict mute');
assert.equal(engine.clipAudible(project([]),{track:4,asset:null}),false,'unassigned clips are never audible');
assert.equal(engine.clipAudible(project([]),{track:2,asset}),false,'caption/overlay tracks are not audio sources');

const __dirname=path.dirname(fileURLToPath(import.meta.url));
const integration=fs.readFileSync(path.join(__dirname,'..','audio-qc-integration.js'),'utf8');
assert.match(integration,/playbackState\.clipAudible\(project,clip\)/,'audio QC must reuse playback audibility rules');

console.log('ProfitMente audio QC/playback audibility parity regression: OK');
