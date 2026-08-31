class ProfitMenteMediaLibraryTools{
  static normalize(value=''){return String(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim()}
  static filter(assets=[],query='',type='all'){
    const q=this.normalize(query),wanted=String(type||'all');
    return (assets||[]).filter(a=>{
      if(wanted!=='all'&&a?.type!==wanted)return false;
      if(!q)return true;
      const hay=this.normalize(`${a?.name||''} ${a?.type||''} ${a?.mime||''}`);
      return hay.includes(q);
    });
  }
  static usage(project,id){return (project?.clips||[]).filter(c=>c?.asset===id)}
  static usedIds(project){return new Set((project?.clips||[]).map(c=>c?.asset).filter(Boolean))}
  static unused(project,assets=[]){const used=this.usedIds(project);return (assets||[]).filter(a=>a?.id&&!used.has(a.id))}
  static assetBytes(asset={}){return Math.max(0,Number(asset?.size??asset?.blob?.size??0)||0)+Math.max(0,Number(asset?.previewBlob?.size??asset?.proxySize??0)||0)}
  static unusedBytes(project,assets=[]){return this.unused(project,assets).reduce((sum,a)=>sum+this.assetBytes(a),0)}
  static proxyAssets(assets=[]){return (assets||[]).filter(a=>a?.previewBlob instanceof Blob&&a.previewBlob.size>0)}
  static proxyBytes(assets=[]){return this.proxyAssets(assets).reduce((sum,a)=>sum+Math.max(0,Number(a.previewBlob.size)||0),0)}
  static suppressedProxyAssets(assets=[]){return (assets||[]).filter(a=>a?.type==='video'&&a?.blob instanceof Blob&&a.proxyAutoDisabled)}
  static dropProxy(asset={},suppress=true){
    const bytes=Math.max(0,Number(asset?.previewBlob?.size??asset?.proxySize??0)||0);
    delete asset.previewBlob;delete asset.previewMime;delete asset.proxySourceFingerprint;delete asset.proxySize;delete asset.proxyGeneratedAt;
    if(suppress)asset.proxyAutoDisabled=true;else delete asset.proxyAutoDisabled;
    return bytes;
  }
  static enableProxy(asset={}){delete asset.proxyAutoDisabled;return asset}
  static preserveMeta(project,asset){
    if(!project||!asset?.id)return project;
    const keys=['id','name','type','mime','size','duration','width','height','metadataVersion','sourceFingerprint','sourceContentHash','sourceLastModified'],meta={};
    for(const k of keys)if(asset[k]!==undefined&&asset[k]!==null)meta[k]=asset[k];
    const list=Array.isArray(project.assets)?project.assets:[];
    const i=list.findIndex(a=>a?.id===asset.id);
    if(i>=0)list[i]={...list[i],...meta};else list.push(meta);
    project.assets=list;return project;
  }
  static pruneProjectAssetMeta(project,removedIds=[]){
    if(!project||!Array.isArray(project.assets))return project;
    const removed=new Set(removedIds);project.assets=project.assets.filter(a=>!removed.has(a?.id));return project;
  }
}
if(typeof window!=='undefined')window.ProfitMenteMediaLibraryTools=ProfitMenteMediaLibraryTools;
if(typeof module!=='undefined'&&module.exports)module.exports=ProfitMenteMediaLibraryTools;

(function integrateMediaLibraryTools(){
  if(typeof document==='undefined'||typeof assets==='undefined'||typeof drawLibrary!=='function')return;
  const library=document.querySelector('#mediaLibrary');if(!library)return;
  const tools=ProfitMenteMediaLibraryTools;
  if(!document.querySelector('#profitmenteMediaLibraryToolsStyle')){const style=document.createElement('style');style.id='profitmenteMediaLibraryToolsStyle';style.textContent='.mediaLibraryTools{display:grid;grid-template-columns:minmax(0,1fr) 82px auto;gap:5px;align-items:center;margin:8px 0 4px}.mediaLibraryTools input,.mediaLibraryTools select{min-width:0;padding:7px 8px;font-size:10px}.mediaLibraryTools span{font-size:9px;color:#8e96a5;grid-column:1/-1}.mediaLibraryTools button{padding:7px 8px!important;margin:0!important;width:auto!important;white-space:nowrap;font-size:10px}.mediaLibraryTools button:disabled{opacity:.45}.mediaStorageActions{display:flex;gap:5px;grid-column:1/-1;flex-wrap:wrap}.mediaStorageActions button{flex:1 1 120px}.mediaRow{display:grid;grid-template-columns:1fr 30px;gap:5px;align-items:stretch}.mediaRow>.mediaCard{width:100%;margin:0}.mediaRow>.mediaDelete{width:30px!important;margin:0!important;padding:3px!important;text-align:center!important;font-size:17px;background:#24171b;border-color:#51303a}.mediaFilterEmpty{padding:8px;color:#7f8795;text-align:center}';document.head.appendChild(style)}
  const controls=document.createElement('div');controls.className='mediaLibraryTools';controls.innerHTML='<input id="mediaSearch" type="search" placeholder="Buscar medios…" aria-label="Buscar medios"><select id="mediaTypeFilter" aria-label="Filtrar medios"><option value="all">Todos</option><option value="video">Video</option><option value="image">Imagen</option><option value="audio">Audio</option></select><span id="mediaCount"></span><div class="mediaStorageActions"><button id="cleanupUnusedMedia" type="button" title="Elimina de IndexedDB los medios que no usa ningún clip">Limpiar no usados</button><button id="cleanupProxyCache" type="button" title="Libera solo proxies de preview; conserva originales y timeline">Liberar proxies</button><button id="restoreProxyCache" type="button" title="Vuelve a permitir proxies automáticos para videos donde se liberó la caché">Regenerar proxies</button></div>';
  library.insertAdjacentElement('beforebegin',controls);
  const search=controls.querySelector('#mediaSearch'),filter=controls.querySelector('#mediaTypeFilter'),count=controls.querySelector('#mediaCount'),cleanup=controls.querySelector('#cleanupUnusedMedia'),cleanupProxies=controls.querySelector('#cleanupProxyCache'),restoreProxies=controls.querySelector('#restoreProxyCache');
  async function removeStoredAsset(id){
    const d=await db();return new Promise((resolve,reject)=>{const tx=d.transaction(STORE,'readwrite');tx.objectStore(STORE).delete(id);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)})
  }
  function cleanupStats(){
    const unused=tools.unused(project,assets),bytes=tools.unusedBytes(project,assets),proxyAssets=tools.proxyAssets(assets),proxyBytes=tools.proxyBytes(assets),suppressed=tools.suppressedProxyAssets(assets);
    cleanup.disabled=!unused.length;cleanup.textContent=unused.length?`Limpiar ${unused.length} no usado${unused.length===1?'':'s'}`:'Sin sobrantes';cleanup.title=unused.length?`Liberar aproximadamente ${(bytes/1048576).toFixed(1)} MB entre originales y proxies que no están en el timeline`:'Todos los medios están en uso';
    cleanupProxies.disabled=!proxyAssets.length;cleanupProxies.textContent=proxyAssets.length?`Liberar proxies · ${(proxyBytes/1048576).toFixed(1)} MB`:'Sin proxies';cleanupProxies.title=proxyAssets.length?`Eliminar solo ${proxyAssets.length} proxy(s) de preview. Los originales permanecen intactos y no se recrearán automáticamente hasta que lo pidas.`:'No hay proxies de preview almacenados';
    restoreProxies.disabled=!suppressed.length;restoreProxies.textContent=suppressed.length?`Regenerar ${suppressed.length} proxy${suppressed.length===1?'':'s'}`:'Proxies automáticos';restoreProxies.title=suppressed.length?`Volver a habilitar y regenerar proxies de preview para ${suppressed.length} video(s)`:'No hay proxies desactivados manualmente';
  }
  function applyFilter(){
    const allowed=new Set(tools.filter(assets,search.value,filter.value).map(a=>a.id));
    let visible=0;library.querySelectorAll('.mediaRow[data-asset-id]').forEach(row=>{const show=allowed.has(row.dataset.assetId);row.hidden=!show;if(show)visible++});
    count.textContent=`${visible}/${assets.length}`;
    if(!visible&&assets.length){let empty=library.querySelector('.mediaFilterEmpty');if(!empty){empty=document.createElement('small');empty.className='mediaFilterEmpty';empty.textContent='Sin coincidencias';library.appendChild(empty)}empty.hidden=false}else{const empty=library.querySelector('.mediaFilterEmpty');if(empty)empty.hidden=true}
    cleanupStats();
  }
  function enhanceRows(){
    [...library.querySelectorAll(':scope > .mediaCard')].forEach((card,index)=>{
      const asset=assets[index];if(!asset)return;
      const row=document.createElement('div');row.className='mediaRow';row.dataset.assetId=asset.id;
      card.parentNode.insertBefore(row,card);row.appendChild(card);
      const del=document.createElement('button');del.type='button';del.className='mediaDelete';del.textContent='×';del.title=`Eliminar ${asset.name} de la biblioteca`;
      del.onclick=async e=>{e.preventDefault();e.stopPropagation();const used=tools.usage(project,asset.id);const msg=used.length?`Este medio se usa en ${used.length} clip(s). Si lo eliminas, esos clips quedarán marcados como medio faltante y podrás reconectarlo después. ¿Eliminar ${asset.name}?`:`¿Eliminar ${asset.name} de la biblioteca local?`;if(!confirm(msg))return;
        try{if(used.length)tools.preserveMeta(project,asset);else tools.pruneProjectAssetMeta(project,[asset.id]);await removeStoredAsset(asset.id);if(asset.url?.startsWith?.('blob:'))URL.revokeObjectURL(asset.url);assets=assets.filter(a=>a.id!==asset.id);persist?.();drawLibrary();drawTimeline?.();renderAt?.(+document.querySelector('#playhead')?.value||0);setStatus?.(used.length?`Medio eliminado · ${used.length} clip(s) requieren reconexión`:'Medio eliminado de la biblioteca')}
        catch(err){console.error(err);setStatus?.('No se pudo eliminar el medio: '+(err?.message||err))}
      };
      row.appendChild(del);
    });
    applyFilter();
  }
  cleanup.onclick=async()=>{
    const unused=tools.unused(project,assets);if(!unused.length)return;
    const bytes=tools.unusedBytes(project,assets),names=unused.slice(0,4).map(a=>a.name).join(', '),more=unused.length>4?` y ${unused.length-4} más`:'';
    if(!confirm(`Eliminar ${unused.length} medio(s) no usados del almacenamiento local (${(bytes/1048576).toFixed(1)} MB aprox.)?\n\n${names}${more}\n\nLos clips del timeline no se modificarán.`))return;
    cleanup.disabled=true;
    try{
      const ids=[];for(const asset of unused){await removeStoredAsset(asset.id);ids.push(asset.id);if(asset.url?.startsWith?.('blob:'))URL.revokeObjectURL(asset.url)}
      const removed=new Set(ids);assets=assets.filter(a=>!removed.has(a.id));tools.pruneProjectAssetMeta(project,ids);persist?.();drawLibrary();drawTimeline?.();setStatus?.(`Limpieza completada · ${ids.length} medio(s) eliminados · ${(bytes/1048576).toFixed(1)} MB liberables`)
    }catch(err){console.error(err);setStatus?.('La limpieza no pudo completarse: '+(err?.message||err));drawLibrary()}
  };
  cleanupProxies.onclick=async()=>{
    const list=tools.proxyAssets(assets);if(!list.length)return;const bytes=tools.proxyBytes(list);
    if(!confirm(`Liberar ${(bytes/1048576).toFixed(1)} MB de proxies de preview?\n\nLos videos originales, clips del timeline y exportaciones no se modificarán. Los proxies permanecerán desactivados hasta que pulses “Regenerar proxies”.`))return;
    cleanupProxies.disabled=true;let released=0,updated=0;
    try{
      for(const asset of list){released+=tools.dropProxy(asset,true);await putAsset(asset);updated++}
      window.ProfitMentePreviewEngine?.clearCache?.();renderAt?.(+document.querySelector('#playhead')?.value||0);cleanupStats();setStatus?.(`Caché de preview liberada · ${updated} proxy(s) · ${(released/1048576).toFixed(1)} MB · originales conservados`)
    }catch(err){console.error(err);setStatus?.('No se pudo liberar toda la caché de proxies: '+(err?.message||err));cleanupStats()}
  };
  restoreProxies.onclick=async()=>{
    const list=tools.suppressedProxyAssets(assets);if(!list.length)return;restoreProxies.disabled=true;
    try{
      for(const asset of list){tools.enableProxy(asset);await putAsset(asset)}
      cleanupStats();setStatus?.(`Regenerando ${list.length} proxy(s) locales…`);await window.ProfitMenteMediaProxies?.enqueue?.(list.map(a=>a.id));cleanupStats();setStatus?.(`Proxies automáticos reactivados para ${list.length} video(s)`)
    }catch(err){console.error(err);setStatus?.('No se pudieron regenerar todos los proxies: '+(err?.message||err));cleanupStats()}
  };
  const baseDraw=drawLibrary;
  drawLibrary=function(){baseDraw();enhanceRows()};
  search.addEventListener('input',applyFilter);filter.addEventListener('change',applyFilter);
  enhanceRows();window.profitMenteMediaLibraryTools=tools;
  if(!document.querySelector('script[data-profitmente-media-import]')){const s=document.createElement('script');s.src='media-import-engine.js';s.dataset.profitmenteMediaImport='1';document.body.appendChild(s)}
})();
