import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const QC=require('./webm-qc-engine.js');

const expected={duration:30,width:1080,height:1920,fps:30};
let r=QC.inspectMetadata({size:1_000_000,duration:30.02,width:1080,height:1920},expected);
assert.equal(r.ok,true);
assert.equal(r.issues.length,0);
assert.equal(r.metrics.width,1080);
assert.equal(r.metrics.height,1920);

r=QC.inspectMetadata({size:1_000_000,duration:24,width:1080,height:1920},expected);
assert.equal(r.ok,false);
assert.match(r.issues.join(' '),/Duración inesperada/);

r=QC.inspectMetadata({size:1_000_000,duration:30,width:1920,height:1080},expected);
assert.equal(r.ok,false);
assert.match(r.issues.join(' '),/Resolución inesperada/);

r=QC.inspectMetadata({size:20,duration:30,width:1080,height:1920},expected);
assert.equal(r.ok,false);
assert.match(r.issues.join(' '),/truncado/);

r=QC.inspectMetadata({size:1_000_000,duration:30.30,width:1080,height:1920},expected);
assert.equal(r.ok,true);
assert.equal(r.warnings.length,1);

assert.match(QC.summary(QC.inspectMetadata({size:1_000_000,duration:30,width:1080,height:1920},expected)),/QA WebM 100\/100/);
console.log('WebM QC regression: OK');
