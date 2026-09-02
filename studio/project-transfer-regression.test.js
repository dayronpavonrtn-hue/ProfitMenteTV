const assert=require('assert');
const fs=require('fs');
const path=require('path');
const {ProfitMenteProjectLibrary}=require('./project-library.js');

class MemoryStorage{
  constructor(){this.data=new Map()}
  getItem(k){return this.data.has(k)?this.data.get(k):null}
  setItem(k,v){this.data.set(k,String(v))}
}

const storage=new MemoryStorage();
const lib=new ProfitMenteProjectLibrary(storage);
const source=lib.save({
  version:'1.3',
  name:'Proyecto transferible',
  mode:'Automático',
  duration:62.5,
  format:'9:16',
  frameRate:60,
  clips:[
    {id:'v1',track:0,start:0,duration:4.5,mediaId:'media-a'},
    {id:'c1',track:2,start:1,duration:2,text:'Hola mundo'}
  ],
  markers:[{time:3,label:'Hook'}],
  trackStates:{0:{locked:false},2:{locked:false}}
});

const serialized=ProfitMenteProjectLibrary.serialize(source);
const envelope=JSON.parse(serialized);
assert.strictEqual(envelope.kind,'profitmente-studio-project','export must use the ProfitMente project envelope');
assert.strictEqual(envelope.schemaVersion,1,'export schema must be versioned');
assert.ok(envelope.exportedAt,'export must be timestamped');
assert.ok(!envelope.project.libraryId,'export must not carry a library id that could overwrite another project');
assert.deepStrictEqual(envelope.project.clips,source.clips,'timeline data must survive export unchanged');
assert.deepStrictEqual(envelope.project.markers,source.markers,'markers must survive export unchanged');

const imported=lib.importSerialized(serialized);
assert.ok(imported.libraryId,'import must create a saved library project');
assert.notStrictEqual(imported.libraryId,source.libraryId,'import must never overwrite the source project');
assert.strictEqual(imported.name,source.name,'project name must survive import');
assert.strictEqual(imported.frameRate,60,'frame rate must survive import');
assert.deepStrictEqual(imported.clips,source.clips,'timeline must survive import exactly');
assert.strictEqual(lib.load(source.libraryId).clips[0].id,'v1','source project must remain intact after import');

const legacy=lib.importSerialized(JSON.stringify({version:'1.3',name:'Legacy',mode:'Manual',duration:30,format:'16:9',clips:[]}));
assert.strictEqual(legacy.name,'Legacy','legacy plain-project JSON must remain importable');
assert.ok(legacy.libraryId,'legacy import must still be isolated as a new library entry');

assert.throws(()=>lib.importSerialized('{broken json'),/JSON válido/,'malformed JSON must be rejected clearly');
assert.throws(()=>lib.importSerialized(JSON.stringify({name:'No timeline',duration:30,format:'9:16'})),/Timeline/,'missing timeline must be rejected');
assert.throws(()=>lib.importSerialized(JSON.stringify({name:'Bad duration',duration:-1,format:'9:16',clips:[]})),/Duración/,'invalid duration must be rejected');
assert.throws(()=>lib.importSerialized(JSON.stringify({name:'Bad format',duration:10,format:'2:1',clips:[]})),/Formato/,'unsupported format must be rejected');
assert.throws(()=>lib.importSerialized(JSON.stringify({name:'Unsupported 4:5',duration:10,format:'4:5',clips:[]})),/Formato/,'4:5 must be rejected until preview and MP4 render support it instead of silently converting it to square');
assert.throws(()=>lib.importSerialized(JSON.stringify({name:'Bad clip',duration:10,format:'9:16',clips:[{start:-2,duration:3}]})),/Tiempo de clip/,'invalid clip timing must be rejected');

const uiSource=fs.readFileSync(path.join(__dirname,'project-library.js'),'utf8');
assert.match(uiSource,/libraryExportBtn/,'project library must expose an Export button');
assert.match(uiSource,/libraryImportBtn/,'project library must expose an Import button');
assert.match(uiSource,/accept="application\/json,.json"/,'import picker must be restricted to JSON project files');
assert.match(uiSource,/file\.size>10\*1024\*1024/,'browser import must cap project file size');
assert.match(uiSource,/imported:true/,'successful imports must notify Studio integrations');
assert.match(uiSource,/ProfitMenteProjectTransfer/,'project transfer controller must be exposed for integrations');

console.log('project transfer regression passed');
