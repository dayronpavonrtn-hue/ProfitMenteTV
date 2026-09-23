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

const validBlob=new Blob([new Uint8Array([0x1a,0x45,0xdf,0xa3,0x00,0x00,0x00,0x00])],{type:'video/webm'});
const validSignature=await QC.inspectSignature(validBlob);
assert.equal(validSignature.ok,true);

const fakeBlob=new Blob([new Uint8Array([0x00,0x00,0x00,0x00,0x11,0x22,0x33,0x44])],{type:'video/webm'});
const fakeSignature=await QC.inspectSignature(fakeBlob);
assert.equal(fakeSignature.ok,false);
assert.match(fakeSignature.issue,/cabecera WebM\/EBML válida/);
const rejected=await QC.inspectBlob(fakeBlob,expected);
assert.equal(rejected.ok,false);
assert.equal(rejected.score,0);
assert.match(rejected.issues.join(' '),/cabecera WebM\/EBML válida/);

console.log('WebM QC regression: OK');
