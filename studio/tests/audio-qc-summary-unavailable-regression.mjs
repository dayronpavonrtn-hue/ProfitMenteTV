import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const QC=require('../audio-qc-engine.js');

const clean=QC.summarize([{status:'ok'},{status:'silent'}]);
assert.equal(clean.ok,true);
assert.equal(clean.unavailable,0);

for(const status of ['unavailable','unknown-status',undefined]){
  const summary=QC.summarize([{status:'ok'},{status}]);
  assert.equal(summary.ok,false,`${String(status)} must fail the QC summary`);
  assert.equal(summary.unavailable,1);
}

const clipping=QC.summarize([{status:'clipping'}]);
assert.equal(clipping.ok,false);

console.log('audio-qc-summary-unavailable-regression: PASS');
