import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const Guard=require('./media-library-cross-project-guard.js');

function makeTools(){
  return {
    usage(project,id){
      const wanted=Guard.mediaIdKey(id);
      return (project?.clips||[]).filter(clip=>Guard.mediaIdKey(clip?.asset)===wanted);
    },
    unused(project,assets=[]){
      const used=new Set((project?.clips||[]).map(clip=>Guard.mediaIdKey(clip?.asset)).filter(Boolean));
      return assets.filter(asset=>!used.has(Guard.mediaIdKey(asset?.id)));
    },
    assetBytes(asset){return Number(asset?.size||0)}
  };
}

const current={libraryId:'project-current',clips:[{id:'c1',asset:2}]};
const savedRows=[
  {id:'project-current',project:{libraryId:'project-current',clips:[{id:'saved-current',asset:'2'}]}},
  {id:'project-other',project:{libraryId:'project-other',clips:[{id:'shared',asset:'01'}]}}
];
const storage={getItem(){return JSON.stringify(savedRows)}};
const assets=[{id:1,size:10},{id:'2',size:20},{id:'3',size:30},{id:true,size:40}];
const tools=makeTools();
Guard.install(tools,{storage});

assert.deepEqual(tools.unused(current,assets).map(asset=>asset.id),['3'],'only media unused across every project may be cleaned');
assert.equal(tools.unusedBytes(current,assets),30,'unused bytes must use the cross-project safe set');
const shared=tools.crossProjectUsage(current,1);
assert.equal(shared.available,true);
assert.equal(shared.otherProjects.length,1,'media used by another saved project must be reported');
assert.equal(shared.otherClips.length,1);
const currentOnly=tools.crossProjectUsage(current,2);
assert.equal(currentOnly.otherProjects.length,0,'the active project saved copy must not count as another project');
assert.equal(Guard.mediaIdKey(true),null,'boolean media identities are invalid');

const brokenTools=makeTools();
Guard.install(brokenTools,{storage:{getItem(){throw new Error('quota/security')}}});
assert.deepEqual(brokenTools.unused({clips:[]},[{id:'orphan',size:100}]),[],'cleanup must fail closed when saved-project storage cannot be verified');
assert.equal(brokenTools.crossProjectUsage({clips:[]},'orphan').available,false,'delete guard must know when cross-project verification is unavailable');

const corruptTools=makeTools();
Guard.install(corruptTools,{storage:{getItem(){return '{broken json'}}});
assert.deepEqual(corruptTools.unused({clips:[]},[{id:'orphan'}]),[],'corrupt project-library data must disable destructive cleanup');

const html=fs.readFileSync(new URL('./index.html',import.meta.url),'utf8');
const app=html.indexOf('<script src="app.js"></script>');
const library=html.indexOf('<script src="media-library-tools.js"></script>');
const cross=html.indexOf('<script src="media-library-cross-project-guard.js"></script>');
const deletion=html.indexOf('<script src="media-library-delete-guard.js"></script>');
const preview=html.indexOf('<script src="preview-engine.js"></script>');
assert.ok(app>=0&&library>app&&cross>library&&deletion>cross&&preview>deletion,'media library tools and guards must load after app.js and before preview extensions');

const deleteGuard=fs.readFileSync(new URL('./media-library-delete-guard.js',import.meta.url),'utf8');
assert.match(deleteGuard,/crossProjectUsage\(project,asset\.id\)/,'delete button must consult cross-project usage');
assert.match(deleteGuard,/if\(!usage\?\.available\)/,'delete button must fail closed when project-library state is unavailable');
assert.match(deleteGuard,/usage\.otherProjects\?\.length/,'delete button must block media shared by saved projects');

console.log('Media library cross-project guard: PASS');
