import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const context={console,window:{}};
context.globalThis=context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(new URL('./media-library-tools.js',import.meta.url),'utf8'),context,{filename:'media-library-tools.js'});
context.window.ProfitMenteMediaLibraryTools=context.ProfitMenteMediaLibraryTools||context.window.ProfitMenteMediaLibraryTools;
vm.runInContext(fs.readFileSync(new URL('./media-library-meta-identity-guard.js',import.meta.url),'utf8'),context,{filename:'media-library-meta-identity-guard.js'});

const Tools=context.window.ProfitMenteMediaLibraryTools;
assert.ok(Tools,'media library tools must load');
assert.ok(context.window.ProfitMenteMediaLibraryMetaIdentityGuard,'identity guard must install');

const project={assets:[{id:'1',name:'old.mp4',type:'video',mime:'video/mp4'}]};
const asset={
  id:1,name:'new.mp4',type:'video',mime:'video/mp4',size:987654,duration:12.5,width:1080,height:1920,
  metadataVersion:4,metadataBlobSignature:'sig-v4',metadataBlobSize:987654,metadataBlobType:'video/mp4',metadataBlobLastModified:1770000123456,
  sourceFingerprint:'new.mp4|987654|video/mp4|1770000123456',sourceContentHash:'sha256-current',sourceLegacyContentHash:'sha256-legacy',sourceHashVersion:'sample-v2',
  sourceLastModified:1770000123456,sourceRelativePath:'campaign/new.mp4',importOrigin:'folder-picker'
};

Tools.preserveMeta(project,asset);
assert.equal(project.assets.length,1,'canonical numeric/string ids must update one manifest entry');
const meta=project.assets[0];
for(const key of context.window.ProfitMenteMediaLibraryMetaIdentityGuard.identityKeys){
  assert.equal(meta[key],asset[key],`${key} must survive preservation for future relink`);
}
assert.equal(meta.name,'new.mp4');
assert.equal(meta.size,987654);
assert.equal(meta.duration,12.5);
assert.equal(meta.width,1080);
assert.equal(meta.height,1920);

const minimal={assets:[]};
Tools.preserveMeta(minimal,{id:'asset-x',name:'x.png',type:'image',mime:'image/png',metadataBlobSignature:'image-sig'});
assert.equal(minimal.assets.length,1);
assert.equal(minimal.assets[0].metadataBlobSignature,'image-sig');

console.log('Media library relink identity preservation regression passed');
