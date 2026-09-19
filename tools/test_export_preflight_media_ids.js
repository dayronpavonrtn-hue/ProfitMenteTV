#!/usr/bin/env node
'use strict';

const assert = require('assert');
const Preflight = require('../studio/export-preflight.js');

function qa(){ return {ok:true,score:100,issues:[],warnings:[],metrics:{}}; }
function project(asset){
  return {
    duration:10,
    mode:'automatic',
    clips:[{track:6,start:0,duration:10,asset}]
  };
}

for (const asset of [0,'0',1,'1','voice-1']) {
  const result=Preflight.narrationCoverage(qa(),project(asset));
  assert.strictEqual(result.metrics.narrationCoverage,100,`asset ${JSON.stringify(asset)} should count as narration media`);
  assert.strictEqual(result.warnings.length,0,`asset ${JSON.stringify(asset)} should not be treated as pending`);
}

for (const asset of [null,undefined,'','   ',false,NaN,Infinity]) {
  const result=Preflight.narrationCoverage(qa(),project(asset));
  assert.strictEqual(result.metrics.narrationCoverage,0,`asset ${String(asset)} must not count as narration media`);
  assert.ok(result.warnings.length>0,`asset ${String(asset)} should keep automatic narration pending`);
}

console.log('OK export preflight media-id regression');
