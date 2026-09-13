const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');

const source=fs.readFileSync(path.join(__dirname,'..','project-import-integration.js'),'utf8');
const projectInput={dataset:{},accept:'',files:[]};
const bundleInput={dataset:{},files:[]};
const playhead={value:6};
const elements={projectInput,bundleInput,playhead};
const stored=[];
const deleted=[];
const statuses=[];
const renders=[];
const firstBlob=new Blob(['first'],{type:'video/mp4'});
const secondBlob=new Blob(['second'],{type:'video/mp4'});
const existingBlob=new Blob(['existing'],{type:'video/mp4'});

class ImportEngine{
  constructor(defaults={}){this.defaults=defaults}
  normalize(value){return structuredClone(value)}
}
class BundleEngine{
  async parse(){
    return {
      project:{
        name:'Imported bundle',duration:12,format:'9:16',mode:'Manual',
        assets:[
          {id:'new-a',name:'first.mp4',type:'video',mime:'video/mp4',size:firstBlob.size},
          {id:'new-b',name:'second.mp4',type:'video',mime:'video/mp4',size:secondBlob.size}
        ],
        clips:[
          {id:'clip-a',track:0,start:0,duration:4,asset:'new-a'},
          {id:'clip-b',track:1,start:4,duration:4,asset:'new-b'}
        ]
      },
      assets:[
        {id:'new-a',name:'first.mp4',type:'video',mime:'video/mp4',size:firstBlob.size,blob:firstBlob},
        {id:'new-b',name:'second.mp4',type:'video',mime:'video/mp4',size:secondBlob.size,blob:secondBlob}
      ]
    };
  }
}
const previousProject={name:'Current',duration:9,format:'9:16',mode:'Manual',clips:[]};
const previousAssets=[{id:'existing',name:'existing.mp4',type:'video',mime:'video/mp4',size:existingBlob.size,blob:existingBlob}];
const context={
  console,Blob,structuredClone,setTimeout,clearTimeout,
  crypto:{randomUUID:()=> 'unused-remap'},
  window:{ProfitMenteProjectImportEngine:ImportEngine,ProfitMenteBundleEngine:BundleEngine},
  document:{
    readyState:'complete',
    querySelector(selector){return elements[selector.replace('#','')]||null}
  },
  globalThis:null,
  ProfitMenteProjectImportEngine:ImportEngine,
  bundler:new BundleEngine(),
  qa:{inspect:()=>({score:100})},
  assets:previousAssets,
  project:previousProject,
  persist(){},originalPersist(){},drawLibrary(){},drawTimeline(){},syncForm(){},
  async renderAt(value){renders.push(value)},
  historyEngine:{seed(){}},updateHistoryButtons(){},
  mediaStore:{async delete(id){deleted.push(id);return true}},
  async putAsset(asset){
    if(asset.id==='new-b')throw new Error('simulated media write failure');
    stored.push(asset.id);
    return asset;
  },
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
  assert.deepStrictEqual(stored,['new-a'],'first media write should complete before the simulated failure');
  assert.deepStrictEqual(deleted,['new-a'],'rollback must remove media newly written before the failure');
  assert.strictEqual(context.project,previousProject,'failed package open must restore the previous active project object');
  assert.strictEqual(context.assets,previousAssets,'failed package open must restore the previous media library object');
  assert.strictEqual(context.assets.length,1,'failed package open must not leave partial imported media in the active library');
  assert.strictEqual(context.assets[0].id,'existing','existing library media must remain untouched');
  assert(renders.includes(6),'rollback should restore preview at the prior playhead');
  assert(statuses.some(text=>text.includes('proyecto y biblioteca anteriores conservados')),'failure status should report rollback preservation');
  console.log('bundle import partial media rollback regression: ok');
})().catch(error=>{console.error(error);process.exitCode=1});