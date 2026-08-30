(()=>{
  if(typeof document==='undefined'||typeof assets==='undefined'||typeof putAsset!=='function'||!window.ProfitMenteMediaMetadataEngine)return;
  const engine=window.ProfitMenteMediaMetadataEngine;
  let running=false;
  async function enrich(ids=null){
    if(running)return {updated:0,failed:0};running=true;let updated=0,failed=0;
    try{
      const wanted=ids?new Set(ids):null;
      for(const asset of assets){
        if(wanted&&!wanted.has(asset.id))continue;if(!engine.needsProbe(asset))continue;
        try{engine.apply(asset,await engine.probe(asset.blob,asset.type));delete asset.metadataError;await putAsset(asset);updated++}
        catch(err){asset.metadataError=String(err?.message||err);failed++;console.warn('No se pudieron recuperar metadatos',asset?.name,err)}
      }
      if(updated){drawLibrary?.();document.dispatchEvent(new CustomEvent('profitmente:media-metadata-updated',{detail:{updated}}))}
      return {updated,failed};
    }finally{running=false}
  }
  function decorateLibrary(){
    const host=document.querySelector('#mediaLibrary');if(!host)return;
    const buttons=[...host.querySelectorAll('button')];
    buttons.forEach((button,index)=>{const asset=assets[index];if(!asset)return;const meta=engine.label(asset);if(meta){button.title=`${asset.name} · ${meta}`;button.dataset.mediaMeta=meta}})
  }
  document.addEventListener('profitmente:media-imported',e=>{enrich(e.detail?.assetIds||null).then(decorateLibrary)});
  document.addEventListener('profitmente:media-metadata-updated',decorateLibrary);
  const observer=new MutationObserver(()=>decorateLibrary());const host=document.querySelector('#mediaLibrary');if(host)observer.observe(host,{childList:true});
  setTimeout(()=>enrich().then(decorateLibrary),0);
  window.ProfitMenteMediaMetadata={engine,enrich,decorateLibrary};
})();
