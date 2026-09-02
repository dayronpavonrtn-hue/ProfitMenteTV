import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {ProfitMenteQAEngine}=require('./qa-engine.js');
const qa=new ProfitMenteQAEngine();

{
  const project={duration:10,format:'9:16',trackStates:{'0':{hidden:true},'4':{muted:true}},clips:[
    {id:'v',name:'Legacy hidden visual',track:0,start:0,duration:10,asset:'missing-video'},
    {id:'a',name:'Legacy muted audio',track:4,start:0,duration:10,asset:'missing-audio'}
  ]};
  const r=qa.inspect(project,[]);
  assert.equal(r.issues.some(x=>x.includes('Medio faltante')),false,'legacy hidden/muted tracks must not fail QA for inactive missing media');
  assert.deepEqual(r.metrics.disabledTracks,[0,4],'legacy hidden/muted tracks must be reported as disabled');
  assert.equal(r.metrics.visualCoverage,0,'legacy hidden visual track must not count toward coverage');
  assert.equal(r.metrics.activeAudioClips,0,'legacy muted audio track must not count as active audio');
}

{
  const project={duration:10,format:'9:16',trackState:{'0':{hidden:false},'4':{muted:false}},trackStates:{'0':{hidden:true},'4':{muted:true}},clips:[
    {id:'v',name:'Mixed hidden visual',track:0,start:0,duration:10,asset:'missing-video'},
    {id:'a',name:'Mixed muted audio',track:4,start:0,duration:10,asset:'missing-audio'}
  ]};
  const r=qa.inspect(project,[]);
  assert.equal(r.issues.some(x=>x.includes('Medio faltante')),false,'legacy disabled state must win when modern mixed state is explicitly false');
  assert.deepEqual(r.metrics.disabledTracks,[0,4],'mixed modern/legacy disabled state must remain conservative');
}

{
  const project={duration:10,format:'9:16',trackState:{'0':{hidden:true}},trackStates:{'0':{hidden:false}},clips:[
    {id:'v',name:'Modern hidden visual',track:0,start:0,duration:10,asset:'missing-video'}
  ]};
  const r=qa.inspect(project,[]);
  assert.equal(r.issues.some(x=>x.includes('Medio faltante')),false,'modern disabled state must remain authoritative when legacy says false');
  assert.deepEqual(r.metrics.disabledTracks,[0]);
}

console.log('QA legacy track state compatibility: ok');
