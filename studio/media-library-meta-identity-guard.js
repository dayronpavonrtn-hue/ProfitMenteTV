(function(root){
  const Tools=root?.ProfitMenteMediaLibraryTools;
  if(!Tools||typeof Tools.preserveMeta!=='function'||Tools.__profitmenteMetaIdentityGuard)return;

  const identityKeys=[
    'metadataBlobSignature','metadataBlobSize','metadataBlobType','metadataBlobLastModified',
    'sourceFingerprint','sourceContentHash','sourceLegacyContentHash','sourceHashVersion',
    'sourceLastModified','sourceRelativePath','importOrigin'
  ];
  const original=Tools.preserveMeta;

  Tools.preserveMeta=function(project,asset){
    const result=original.call(this,project,asset);
    if(!project||!Array.isArray(project.assets)||!asset)return result;
    const key=this.mediaKey?.(asset.id);
    if(key===null||key===undefined)return result;
    const meta=project.assets.find(item=>this.mediaKey?.(item?.id)===key);
    if(!meta)return result;
    for(const field of identityKeys){
      const value=asset[field];
      if(value!==undefined&&value!==null)meta[field]=value;
    }
    return result;
  };

  try{Object.defineProperty(Tools,'__profitmenteMetaIdentityGuard',{value:true,configurable:true})}
  catch{Tools.__profitmenteMetaIdentityGuard=true}
  root.ProfitMenteMediaLibraryMetaIdentityGuard={identityKeys:[...identityKeys]};

  // Once inspected media has stable content identity, replace the basic upload
  // handler with the zero-cost duplicate guard. Loading here keeps the guard
  // ordered after the media inspector without adding a paid/external dependency.
  if(typeof document!=='undefined'&&!root.ProfitMenteMediaUploadDedupe&&!document.querySelector('script[data-profitmente-media-upload-dedupe]')){
    const script=document.createElement('script');
    script.src='media-upload-dedupe.js';
    script.async=false;
    script.dataset.profitmenteMediaUploadDedupe='1';
    document.body.appendChild(script);
  }
})(typeof window!=='undefined'?window:globalThis);
