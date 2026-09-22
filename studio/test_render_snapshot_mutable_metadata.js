const assert=require('assert');
const Snapshot=require('./render-snapshot-engine.js');

const samples=new Float32Array([0.1,0.5,0.9]);
const bytes=new Uint8Array([1,2,3,4]);
const project={name:'Snapshot QA',clips:[{id:'c1',asset:'a1'}],analysis:new Map([['peaks',samples]])};
const assets=[{id:'a1',metadata:{bytes,tags:new Set(['local','qc'])}}];
const snap=Snapshot.capture(project,assets);

assert.notStrictEqual(snap.project,project);
assert.notStrictEqual(snap.project.analysis,project.analysis);
assert.notStrictEqual(snap.project.analysis.get('peaks'),samples);
assert.notStrictEqual(snap.assets[0].metadata.bytes,bytes);
assert.notStrictEqual(snap.assets[0].metadata.tags,assets[0].metadata.tags);

samples[0]=99;bytes[0]=99;assets[0].metadata.tags.add('mutated');project.clips[0].id='changed';
assert.ok(Math.abs(snap.project.analysis.get('peaks')[0]-0.1)<1e-6);
assert.strictEqual(snap.assets[0].metadata.bytes[0],1);
assert.deepStrictEqual([...snap.assets[0].metadata.tags],['local','qc']);
assert.strictEqual(snap.project.clips[0].id,'c1');

const buffer=new ArrayBuffer(8);new Uint8Array(buffer)[0]=7;
const bufferCopy=Snapshot.clone(buffer);new Uint8Array(buffer)[0]=8;
assert.strictEqual(new Uint8Array(bufferCopy)[0],7);

console.log('OK render snapshot isolates mutable metadata');
