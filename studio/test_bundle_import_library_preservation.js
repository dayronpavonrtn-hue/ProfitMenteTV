const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');

const source=fs.readFileSync(path.join(__dirname,'project-import-integration.js'),'utf8');
const projectInput={dataset:{},accept:'',files:[]};
const bundleInput={dataset:{},files:[]};
const playhead={value:7};
const elements={projectInput,bundleInput,playhead};
const stored=[];
const statuses=[];
const existingBlob=new Blob(['old'],{type:'video/mp4'});
const incomingBlob=new Blob(['new-and-different'],{type:'video/mp4'});

class ImportEngine{
  constructor(defaults={}){this.defaults=defaults}
  normalize(value){return structuredClone(value)}
}
class BundleEngine{
  async parse(){
    return {
      project:{
        name:'Imported bundle',duration:12,format:'9:16',mode:'Manual',
        assets:[{id:'shared-id',name:'incoming.mp4',type:'video',mime:'video/mp4',size:incomingBlob.size}],
        clips:[{id:'clip-1',track:0,start:0,duration:4,asset:'shared-id'}]
      },
      assets:[{id:'shared-id',name:'incoming.mp4',type:'video',mime:'video/mp4',size:incomingBlob.size,blob:incomingBlob}]
    };
  }
}
const bundler=new BundleEngine();
const context={
  console,Blob,structuredClone,setTimeout,clearTimeout,
  crypto:{randomUUID:()=> 'remapped-bundle-id'},
  window:{ProfitMenteProjectImportEngine:ImportEngine,ProfitMenteBundleEngine:BundleEngine},
  document:{
    readyState:'complete',
    querySelector(selector){return elements[selector.replace('#','')]||null}
  },
  globalThis:null,
  ProfitMenteProjectImportEngine:ImportEngine,
  bundler,
  qa:{inspect:()=>({score:100})},
  assets:[{id:'shared-id',name:'existing.mp4',type:'video',mime:'video/mp4',size:existingBlob.size,blob:existingBlob}],
  project:{name:'Current',duration:5,format:'9:16',mode:'Manual',clips:[]},
  persist(){},originalPersist(){},drawLibrary(){},drawTimeline(){},syncForm(){},async renderAt(){},
  historyEngine:{seed(){}},updateHistoryButtons(){},
  async putAsset(asset){stored.push(asset)},
  setStatus(value){statuses.push(value)}
};
context.globalThis=context;
context.window.window=context.window;
context.window.document=context.document;
context.window.globalThis=context;
context.window.crypto=context.crypto;
vm.createContext(context);
vm.runInContext(source,context,{filename:'project-import-integration.js'});

(async()=>{
  assert.strictEqual(bundleInput.dataset.profitmenteSafeOpen,'1','safe package-open handler should install');
  await bundleInput.onchange({target:{files:[{name:'bundle.profitmente.tar'}],value:'bundle.profitmente.tar'}});
  assert.strictEqual(context.assets.length,2,'opening a package must preserve unrelated existing library media');
  assert.strictEqual(context.assets[0].id,'shared-id','existing media identity must remain untouched');
  const imported=context.assets.find(asset=>asset.name==='incoming.mp4');
  assert(imported,'imported media should be added to the library');
  assert.strictEqual(imported.id,'remapped-bundle-id','conflicting imported id must be remapped instead of overwriting existing media');
  assert.strictEqual(context.project.clips[0].asset,'remapped-bundle-id','timeline references must follow the remapped media id');
  assert.strictEqual(context.project.assets[0].id,'remapped-bundle-id','project media manifest must follow the remapped media id');
  assert.strictEqual(stored.length,1,'only the imported media should be persisted by package open');
  assert.strictEqual(stored[0].id,'remapped-bundle-id','persistent media store must receive the collision-safe id');
  assert(statuses.some(text=>text.includes('2 medios en biblioteca')),'status should report the merged media library');
  console.log('bundle import library preservation regression: ok');
})().catch(error=>{console.error(error);process.exitCode=1});
