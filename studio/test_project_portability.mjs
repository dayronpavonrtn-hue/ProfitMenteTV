import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const Portability=require('./project-portability.js');

const project={version:'1.3',name:'Portable',duration:12,format:'9:16',clips:[{id:'c1',track:0,asset:'a1',start:0,duration:6}]};
const assets=[{id:'a1',name:'clip.mp4',type:'video',mime:'video/mp4',size:1234567,duration:8.25,width:1080,height:1920,metadataVersion:1,blob:{private:true},thumbnail:'data:image/jpeg;base64,NO'}];
const clean=Portability.serialize(project,assets);
assert.equal(clean.assets.length,1);
assert.deepEqual(clean.assets[0],{id:'a1',name:'clip.mp4',type:'video',mime:'video/mp4',size:1234567,duration:8.25,width:1080,height:1920,metadataVersion:1});
assert.equal('blob' in clean.assets[0],false);
assert.equal('thumbnail' in clean.assets[0],false);

const restored=Portability.normalize(JSON.parse(JSON.stringify(clean)),{name:'old',duration:45,format:'16:9',clips:[]});
assert.equal(restored.name,'Portable');
assert.equal(restored.duration,12);
assert.equal(restored.format,'9:16');
assert.equal(restored.assets[0].size,1234567);
assert.equal(restored.assets[0].duration,8.25);
assert.equal(restored.assets[0].width,1080);
assert.equal(restored.assets[0].height,1920);
assert.throws(()=>Portability.normalize({duration:0,clips:[]},{}),/Duración/);
assert.throws(()=>Portability.normalize([],{}),/inválido/);
console.log('Project portability QA OK');
