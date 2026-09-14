import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const Snapshot=require('./render-snapshot-engine.js');

const blob=new Blob(['video']);
const project={
  id:'p1',
  clips:[{id:'c1',asset:'a',start:0,duration:4,effects:{opacity:1}}],
  settings:{fps:30},
  createdAt:new Date('2026-09-09T00:00:00Z')
};
const assets=[{id:'a',name:'clip.mp4',file:blob,meta:{duration:10}}];
const captured=Snapshot.capture(project,assets);
assert.notEqual(captured.project,project,'project snapshot must be detached');
assert.notEqual(captured.project.clips,project.clips,'timeline arrays must be detached');
assert.notEqual(captured.assets,assets,'asset list must be detached');
assert.notEqual(captured.assets[0],assets[0],'asset descriptors must be detached');
assert.equal(captured.assets[0].file,blob,'binary media should be reused instead of duplicated');
assert.equal(captured.project.createdAt.getTime(),project.createdAt.getTime(),'dates should preserve their value');
project.clips[0].duration=99;
project.clips[0].effects.opacity=.2;
assets[0].name='changed.mp4';
assets[0].meta.duration=1;
assert.equal(captured.project.clips[0].duration,4);
assert.equal(captured.project.clips[0].effects.opacity,1);
assert.equal(captured.assets[0].name,'clip.mp4');
assert.equal(captured.assets[0].meta.duration,10);
await assert.rejects(async()=>Snapshot.capture(null,assets),/Proyecto inválido/);

let releaseRender;
const renderGate=new Promise(resolve=>{releaseRender=resolve});
let releaseDownload;
const downloadGate=new Promise(resolve=>{releaseDownload=resolve});
let releaseSave;
const saveGate=new Promise(resolve=>{releaseSave=resolve});
class FakeBundle{
  async renderLocal(project,assets){
    await renderGate;
    return {duration:project.clips[0].duration,name:assets[0].name,metaDuration:assets[0].meta.duration};
  }
  async download(project,assets){
    await downloadGate;
    return {duration:project.clips[0].duration,name:assets[0].name,metaDuration:assets[0].meta.duration};
  }
  async save(project,assets,options={}){
    await saveGate;
    return {duration:project.clips[0].duration,name:assets[0].name,metaDuration:assets[0].meta.duration,handle:options.handle};
  }
}
assert.equal(Snapshot.install(FakeBundle),true,'install should patch a renderer once');
assert.equal(Snapshot.install(FakeBundle),false,'install should be idempotent');
const liveProject={clips:[{id:'clip',asset:'media',duration:6}]};
const liveAssets=[{id:'media',name:'before.mp4',meta:{duration:12}}];
const pending=new FakeBundle().renderLocal(liveProject,liveAssets);
liveProject.clips[0].duration=60;
liveAssets[0].name='after.mp4';
liveAssets[0].meta.duration=2;
releaseRender();
assert.deepEqual(await pending,{duration:6,name:'before.mp4',metaDuration:12},'edits made after render starts must not alter the in-flight render');

const exportProject={clips:[{id:'clip-export',asset:'media-export',duration:8}]};
const exportAssets=[{id:'media-export',name:'portable-before.mp4',meta:{duration:15}}];
const pendingDownload=new FakeBundle().download(exportProject,exportAssets);
exportProject.clips[0].duration=80;
exportAssets[0].name='portable-after.mp4';
exportAssets[0].meta.duration=3;
releaseDownload();
assert.deepEqual(await pendingDownload,{duration:8,name:'portable-before.mp4',metaDuration:15},'edits made after bundle export starts must not alter the portable package snapshot');

const saveHandle={name:'portable.pmstudio'};
const saveProject={clips:[{id:'clip-save',asset:'media-save',duration:11}]};
const saveAssets=[{id:'media-save',name:'save-before.mp4',meta:{duration:21}}];
const pendingSave=new FakeBundle().save(saveProject,saveAssets,{handle:saveHandle});
saveProject.clips[0].duration=110;
saveAssets[0].name='save-after.mp4';
saveAssets[0].meta.duration=4;
releaseSave();
assert.deepEqual(await pendingSave,{duration:11,name:'save-before.mp4',metaDuration:21,handle:saveHandle},'edits made after file-system bundle save starts must not alter the saved package snapshot');

const cycle={name:'cycle'};cycle.self=cycle;
const clonedCycle=Snapshot.clone(cycle);
assert.notEqual(clonedCycle,cycle);
assert.equal(clonedCycle.self,clonedCycle,'cyclic plain data should remain valid');

console.log('Render snapshot QA OK');
