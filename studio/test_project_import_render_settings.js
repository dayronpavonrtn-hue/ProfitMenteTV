const assert=require('assert');
const {ProfitMenteProjectImportEngine}=require('./project-import-engine.js');

const engine=new ProfitMenteProjectImportEngine();
const base={version:'1.3',name:'Import test',mode:'Manual',duration:45,format:'9:16',clips:[]};
const normalize=changes=>engine.normalize({...base,...changes});
const rejects=(changes,pattern)=>assert.throws(()=>normalize(changes),pattern);

assert.strictEqual(normalize({}).fps,30,'legacy projects without fps must retain the renderer default');
assert.strictEqual(normalize({}).renderQuality,'high','legacy projects without quality must retain the renderer default');
for(const fps of [24,30,60])assert.strictEqual(normalize({fps}).fps,fps);
for(const fps of ['24','30','60'])assert.strictEqual(normalize({fps}).fps,Number(fps));
for(const fps of [25,29.97,120,0,true,'','oops'])rejects({fps},/FPS/);
for(const renderQuality of ['draft','standard','high'])assert.strictEqual(normalize({renderQuality}).renderQuality,renderQuality);
assert.strictEqual(normalize({renderQuality:' HIGH '}).renderQuality,'high');
for(const renderQuality of ['ultra','',1])rejects({renderQuality},/Calidad/);
assert.strictEqual(normalize({duration:21600}).duration,21600);
rejects({duration:21600.001},/máximo 6 horas/);
rejects({duration:86400},/máximo 6 horas/);

console.log('project import render settings parity: ok');
