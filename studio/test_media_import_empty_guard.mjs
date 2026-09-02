import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

globalThis.window=globalThis;
vm.runInThisContext(fs.readFileSync(new URL('./media-import-engine.js',import.meta.url),'utf8'),{filename:'media-import-engine.js'});
const E=globalThis.ProfitMenteMediaImportEngine;
assert.ok(E,'media import engine must be exported');

const emptyVideo=new Blob([],{type:'video/mp4'});
Object.defineProperty(emptyVideo,'name',{value:'empty.mp4'});
const emptyAudio=new Blob([],{type:'audio/wav'});
Object.defineProperty(emptyAudio,'name',{value:'empty.wav'});
const validVideo=new Blob(['frame-data'],{type:'video/mp4'});
Object.defineProperty(validVideo,'name',{value:'valid.mp4'});

assert.equal(E.kind(emptyVideo),'video','extension/MIME classification remains independent from file health');
assert.equal(E.sizeOf(emptyVideo),0);
assert.equal(E.hasContent(emptyVideo),false,'zero-byte video must be rejected before persistence');
assert.equal(E.hasContent(emptyAudio),false,'zero-byte audio must be rejected before persistence');
assert.equal(E.hasContent(validVideo),true,'non-empty media must remain importable');
assert.deepEqual(E.compatible([emptyVideo,validVideo,emptyAudio]).map(file=>file.name),['valid.mp4'],'compatible() must omit empty media');
assert.equal(E.hasContent({name:'legacy.mp4',type:'video/mp4'}),true,'unknown size metadata must not be rejected prematurely');
assert.equal(E.hasContent({name:'bad.mp4',type:'video/mp4',size:-1}),false,'invalid negative size must not enter the library');

console.log('media import empty-file guard regression passed');
