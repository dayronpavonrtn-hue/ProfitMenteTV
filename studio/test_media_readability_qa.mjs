import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const ProfitMenteMediaInspector=require('./media-inspector.js');
const {ProfitMenteQAEngine}=require('./qa-engine.js');
const ProfitMenteMediaRelinkEngine=require('./media-relink-engine.js');

const inspector=new ProfitMenteMediaInspector();
assert.equal(inspector.version,2);
inspector.inspectVideo=async()=>{throw new Error('Video inválido o códec no compatible')};
const bad=await inspector.inspect({id:'bad',name:'bad.mov',type:'video',blob:new Blob(['not-video']),metadataVersion:1});
assert.equal(bad.mediaReadable,false);
assert.match(bad.mediaError,/códec no compatible/);
assert.equal(bad.metadataVersion,2);
assert.match(inspector.label(bad),/no legible/);

const goodInspector=new ProfitMenteMediaInspector();
goodInspector.inspectVideo=async()=>({duration:10,width:1920,height:1080,thumbnail:null});
const good=await goodInspector.inspect({id:'good',name:'good.mp4',type:'video',blob:new Blob(['ok'])});
assert.equal(good.mediaReadable,true);
assert.equal(good.mediaError,'');
assert.equal(good.duration,10);

const qa=new ProfitMenteQAEngine();
const project={duration:5,format:'16:9',clips:[{id:'c1',name:'Toma dañada',track:0,start:0,duration:5,asset:'bad'}]};
const report=qa.inspect(project,[bad]);
assert.equal(report.ok,false);
assert(report.issues.some(x=>x.includes('Medio no decodificable')));

const hiddenReport=qa.inspect({...project,trackState:{0:{hidden:true}}},[bad]);
assert(!hiddenReport.issues.some(x=>x.includes('Medio no decodificable')),'Una pista visual oculta no debe bloquear el render');

const relinkAsset={id:'bad',name:'bad.mov',type:'video',mediaReadable:false,mediaError:'error',metadataVersion:2,duration:8,width:1920,height:1080,thumbnail:'data:x'};
const replacement=new Blob(['replacement'],{type:'video/mp4'});Object.defineProperty(replacement,'name',{value:'bad.mov'});
const relink=ProfitMenteMediaRelinkEngine.apply(relinkAsset,replacement);
assert.equal(relink.ok,true);
for(const key of ['mediaReadable','mediaError','metadataVersion','duration','width','height','thumbnail'])assert.equal(relinkAsset[key],undefined,`${key} debe invalidarse al reenlazar`);

console.log('media readability QA regression ok');
