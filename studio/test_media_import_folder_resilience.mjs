import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const Engine=require('./media-import-engine.js');

const fileEntry=(name,{path=`/${name}`,fail=false}={})=>({
  isFile:true,isDirectory:false,name,fullPath:path,
  file(resolve,reject){queueMicrotask(()=>fail?reject(new Error(`unreadable:${name}`)):resolve({name,type:'video/mp4',size:128,lastModified:1}))}
});

const dirEntry=(name,batches,{path=`/${name}`,failAt=-1,createFail=false}={})=>({
  isFile:false,isDirectory:true,name,fullPath:path,
  createReader(){
    if(createFail)throw new Error(`cannot-open:${name}`);
    let index=0;
    return {readEntries(resolve,reject){
      const current=index++;
      queueMicrotask(()=>current===failAt?reject(new Error(`cannot-read:${name}`)):resolve(batches[current]??[]));
    }};
  }
});

const transfer=(entries,files=[])=>({
  items:entries.map(entry=>({webkitGetAsEntry:()=>entry})),
  files
});

{
  const good=fileEntry('good.mp4');
  const broken=fileEntry('broken.mp4',{fail:true});
  const result=await Engine.filesFromDataTransfer(transfer([good,broken]));
  assert.equal(result.length,1,'a broken sibling must not cancel a readable file');
  assert.equal(result[0].name,'good.mp4');
  assert.equal(result.sourceReadFailures,1);
  assert.equal(Object.keys(result).includes('sourceReadFailures'),false,'failure metadata should not pollute normal array enumeration');
}

{
  const nestedGood=fileEntry('nested.mp4',{path:'/project/scenes/nested.mp4'});
  const nestedBroken=fileEntry('bad.mov',{path:'/project/scenes/bad.mov',fail:true});
  const scenes=dirEntry('scenes',[[nestedGood,nestedBroken],[]],{path:'/project/scenes'});
  const root=dirEntry('project',[[scenes],[]],{path:'/project'});
  const result=await Engine.filesFromDataTransfer(transfer([root]));
  assert.equal(result.length,1,'nested readable media must survive a failed nested sibling');
  assert.equal(result[0].sourceRelativePath,'project/scenes/nested.mp4');
  assert.equal(result.sourceReadFailures,1);
}

{
  const healthy=fileEntry('outside.mp4',{path:'/outside.mp4'});
  const unreadableDir=dirEntry('locked',[],{failAt:0});
  const result=await Engine.filesFromDataTransfer(transfer([unreadableDir,healthy]));
  assert.equal(result.length,1,'an unreadable directory must not cancel healthy top-level siblings');
  assert.equal(result[0].name,'outside.mp4');
  assert.equal(result.sourceReadFailures,1);
}

{
  const healthy=fileEntry('outside.mp4');
  const unopened=dirEntry('unopened',[],{createFail:true});
  const result=await Engine.filesFromDataTransfer(transfer([unopened,healthy]));
  assert.equal(result.length,1,'createReader failure must remain isolated');
  assert.equal(result.sourceReadFailures,1);
}

{
  const result=await Engine.filesFromDataTransfer(transfer([
    fileEntry('one.mp4',{fail:true}),
    dirEntry('locked',[],{failAt:0})
  ]));
  assert.deepEqual(Array.from(result),[],'all failed entries should return an empty readable set');
  assert.equal(result.sourceReadFailures,2,'all source read failures must be reported');
}

{
  const fallback={name:'fallback.mp4',type:'video/mp4',size:10};
  const result=await Engine.filesFromDataTransfer({items:[],files:[fallback]});
  assert.deepEqual(result,[fallback],'non-entry DataTransfer fallback must stay backward compatible');
}

console.log('media import folder resilience regression passed');
