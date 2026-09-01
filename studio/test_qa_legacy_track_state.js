#!/usr/bin/env node
const assert=require('assert');
const {ProfitMenteQAEngine}=require('./qa-engine.js');
const Guard=require('./qa-legacy-track-state-guard.js');

assert.strictEqual(Guard.install(),false,'guard should already be installed by module load');
const qa=new ProfitMenteQAEngine();

function inspect(extra={}){
  return qa.inspect({
    duration:10,
    clips:[
      {id:'v1',name:'Legacy hidden video',track:0,start:0,duration:10,asset:'missing-video'},
      {id:'a1',name:'Legacy muted audio',track:5,start:0,duration:10,asset:'missing-audio'}
    ],
    ...extra
  },[]);
}

let r=inspect({trackStates:{0:{hidden:true},5:{muted:true}}});
assert(!r.issues.some(x=>x.includes('Medio faltante')),'legacy disabled tracks must not report missing media');
assert(r.warnings.some(x=>x.includes('Pistas desactivadas')&&x.includes('0')&&x.includes('5')),'legacy disabled tracks must be reported');
assert.strictEqual(r.metrics.visualCoverage,0,'hidden legacy visual track must not count toward coverage');
assert.strictEqual(r.metrics.activeAudioClips,0,'muted legacy audio track must not count as active');

r=inspect({trackState:{0:{hidden:false},5:{muted:false}},trackStates:{0:{hidden:true},5:{muted:true}}});
assert(!r.issues.some(x=>x.includes('Medio faltante')),'legacy true must win over conflicting current false');
assert(r.warnings.some(x=>x.includes('Pistas desactivadas')),'conflicting legacy disabled state must remain visible to QA');

r=inspect({trackState:{0:{hidden:false},5:{muted:false}},trackStates:{}});
assert.strictEqual(r.issues.filter(x=>x.includes('Medio faltante')).length,2,'active tracks must still report missing media');

const normalized=Guard.normalize({trackState:{'0':{hidden:false}},trackStates:{'0':{hidden:true,locked:true},'1':{solo:true}}});
assert.strictEqual(normalized.trackState['0'].hidden,true);
assert.strictEqual(normalized.trackState['0'].locked,true);
assert.strictEqual(normalized.trackState['1'].solo,true);

console.log('QA legacy track-state compatibility OK');
