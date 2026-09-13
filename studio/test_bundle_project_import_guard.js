'use strict';

const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');

const source=fs.readFileSync(path.join(__dirname,'project-import-integration.js'),'utf8');
let normalizeCalls=0;
let migrationCalls=0;

class FakeBundleEngine{
  async parse(){
    return {
      project:{libraryId:'legacy-project',name:'Bundle test',duration:'12.5',clips:[{id:'c1',start:'2',duration:'3'}]},
      assets:[{id:'asset-1',name:'clip.mp4'}]
    };
  }
}
class FakeImportEngine{
  constructor(defaults={}){this.defaults=defaults}
  normalize(value){
    normalizeCalls++;
    return {
      ...this.defaults,
      ...structuredClone(value),
      duration:Number(value.duration),
      clips:value.clips.map(clip=>({...clip,start:Number(clip.start),duration:Number(clip.duration)}))
    };
  }
}
class FakeLibrary{
  static blank(){return {format:'9:16',duration:60,clips:[]}}
  load(){return null}
}
FakeLibrary.prototype.duplicate=function(){return null};

const input={accept:'',onchange:null};
const window={
  ProfitMenteBundleEngine:FakeBundleEngine,
  ProfitMenteProjectImportEngine:FakeImportEngine,
  ProfitMenteProjectLibrary:FakeLibrary,
  ProfitMenteProjectMigration:{engine:{migrate(project){migrationCalls++;return {project:{...project,migrated:true}}}}},
  addEventListener(){},
  dispatchEvent(){}
};
const document={
  readyState:'complete',
  querySelector(selector){return selector==='#projectInput'?input:null}
};
const context={window,document,console,structuredClone,CustomEvent:class CustomEvent{}};
context.globalThis=context;
Object.assign(context,window);
vm.createContext(context);
vm.runInContext(source,context,{filename:'project-import-integration.js'});

(async()=>{
  assert.strictEqual(window.ProfitMenteBundleProjectImportGuard?.enabled,true,'bundle import guard should install');
  assert.strictEqual(window.ProfitMenteBundleProjectImportGuard?.normalized,true,'bundle guard should report normalization');
  assert.strictEqual(window.ProfitMenteBundleProjectImportGuard?.migrated,true,'bundle guard should report migration');
  const engine=new FakeBundleEngine();
  const restored=await engine.parse(new Blob());
  assert.strictEqual(restored.project.duration,12.5,'bundle duration should pass through project normalization');
  assert.strictEqual(restored.project.clips[0].start,2,'clip start should pass through project normalization');
  assert.strictEqual(restored.project.clips[0].duration,3,'clip duration should pass through project normalization');
  assert.strictEqual(restored.project.libraryId,undefined,'restored package must not retain a saved-library identity');
  assert.strictEqual(restored.project.migrated,true,'normalized package should pass through project migration');
  assert.deepStrictEqual(restored.assets,[{id:'asset-1',name:'clip.mp4'}],'bundle media restoration must remain intact');
  assert.strictEqual(normalizeCalls,1,'bundle parse should normalize exactly once');
  assert.strictEqual(migrationCalls,1,'bundle parse should migrate exactly once');

  vm.runInContext(source,context,{filename:'project-import-integration.js'});
  await engine.parse(new Blob());
  assert.strictEqual(normalizeCalls,2,'reinstalling integration must not stack bundle parse guards');
  assert.strictEqual(migrationCalls,2,'reinstalling integration must not stack migrations');

  console.log('ProfitMente full-package project import guard regression: OK');
})().catch(err=>{console.error(err);process.exitCode=1});
