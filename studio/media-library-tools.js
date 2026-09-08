class ProfitMenteMediaLibraryTools{
  static normalize(value=''){return String(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim()}
  static mediaKey(value){
    if(value===undefined||value===null)return null;
    const raw=String(value).trim();if(!raw)return null;
    const numeric=Number(raw);
    return Number.isFinite(numeric)&&Number.isInteger(numeric)?String(numeric):raw;
  }
  static sameMediaId(a,b){const left=this.mediaKey(a),right=this.mediaKey(b);return left!==null&&right!==null&&left===right}
  static filter(assets=[],query='',type='all'){
    const q=this.normalize(query),wanted=String(type||'all');
    return (assets||[]).filter(a=>{
      if(wanted!=='all'&&a?.type!==wanted)return false;
      if(!q)return true;
      const hay=this.normalize(`${a?.name||''} ${a?.type||''} ${a?.mime||''}`);
      return hay.includes(q);
    });
  }
  static usage(project,id){const key=this.mediaKey(id);return key===null?[]:(project?.clips||[]).filter(c=>this.mediaKey(c?.asset)===key)}
  static usedIds(project){
    const used=new Set();
    for(const clip of project?.clips||[]){const key=this.mediaKey(clip?.asset);if(key!==null)used.add(key)}
    return used;
  }
  static unused(project,assets=[]){
    const used=this.usedIds(project);
    return (assets||[]).filter(a=>{const key=this.mediaKey(a?.id);return key!==null&&!used.has(key)});
  }
  static assetBytes(asset={}){return Math.max(0,Number(asset?.size??asset?.blob?.size??0)||0)+Math.max(0,Number(asset?.previewBlob?.size??asset?.proxySize??0)||0)}
  static unusedBytes(project,assets=[]){return this.unused(project,assets).reduce((sum,a)=>sum+this.assetBytes(a),0)}
  static proxyAssets(assets=[]){return (assets||[]).filter(a=>a?.previewBlob instanceof Blob&&a.previewBlob.size>0)}
  static proxyBytes(assets=[]){return this.proxyAssets(assets).reduce((sum,a)=>sum+Math.max(0,Number(a.previewBlob.size)||0),0)}
  static suppressedProxyAssets(assets=[]){return (assets||[]).filter(a=>a?.type==='video'&&a?.blob instanceof Blob&&a.proxyAutoDisabled)}
  static dropProxy(asset={},suppress=true){
    const bytes=Math.max(0,Number(asset?.previewBlob?.size??asset?.proxySize??0)||0);
    delete asset.previewBlob;delete asset.previewMime;delete asset.proxySourceFingerprint;delete asset.proxySize;delete asset.proxyGeneratedAt;delete asset.proxyStatus;delete asset.proxyError;
    if(suppress)asset.proxyAutoDisabled=true;else delete asset.proxyAutoDisabled;
    return bytes;
  }
  static enableProxy(asset={}){delete asset.proxyAutoDisabled;delete asset.proxyStatus;delete asset.proxyError;return asset}
  static preserveMeta(project,asset){
    const key=this.mediaKey(asset?.id);if(!project||key===null)return project;
    const keys=['id','name','type','mime','size','duration','width','height','metadataVersion','sourceFingerprint','sourceContentHash','sourceLastModified'],meta={};
    for(const k of keys)if(asset[k]!==undefined&&asset[k]!==null)meta[k]=asset[k];
    const list=Array.isArray(project.assets)?project.assets:[];
    const i=list.findIndex(a=>this.mediaKey(a?.id)===key);
    if(i>=0)list[i]={...list[i],...meta};else list.push(meta);
    project.assets=list;return project;
  }
  static pruneProjectAssetMeta(project,removedIds=[]){
    if(!project||!Array.isArray(project.assets))return project;
    const removed=new Set((removedIds||[]).map(id=>this.mediaKey(id)).filter(key=>key!==null));
    project.assets=project.assets.filter(a=>{const key=this.mediaKey(a?.id);return key===null||!removed.has(key)});return project;
  }
}
if(typeof window!=='undefined')window.ProfitMenteMediaLibraryTools=ProfitMenteMediaLibraryTools;
if(typeof module!=='undefined'&&module.exports)module.exports=ProfitMenteMediaLibraryTools;

(function integrateMediaLibraryTools(){
  if(typeof document==='undefined'||typeof assets==='undefined'||typeof drawLibrary!=='function')return;
  const library=document.querySelector('#mediaLibrary');if(!library)return;
  const tools=ProfitMenteMediaLibraryTools;
  if(!document.querySelector('#profitmenteMediaLibraryToolsStyle')){const style=document.createElement('style');style.id='profitmenteMediaLibraryToolsStyle';style.textContent='.mediaLibraryTools{display:grid;grid-template-columns:minmax(0,1fr) 82px auto;gap:5px;align-items:center;margin:8px 0 4px}.mediaLibraryTools input,.mediaLibraryTools select{min-width:0;padding:7px 8px;font-size:10px}.mediaLibraryTools span{font-size:9px;color:#8e96a5;grid-column:1/-1}.mediaLibraryTools button{padding:7px 8px!important;margin:0!important;width:auto!important;white-space:nowrap;font-size:10px}.mediaLibraryTools button:disabled{opacity:.45}.mediaStorageActions{display:flex;gap:5px;grid-column:1/-1;flex-wrap:wrap}.mediaStorageActions button{flex:1 1 120px}.mediaRow{display:grid;grid-template-columns:minmax(0,1fr) auto 30px;gap:5px;align-items:stretch}.mediaRow>.mediaCard{width:100%;margin:0}.mediaProxyActions{display:flex;gap:3px;align-items:stretch}.mediaProxyActions button{padding:3px 6px!important;margin:0!important;width:auto!important;min-width:52px;font-size:9px;white-space:nowrap}.mediaProxyActions .mediaProxyRebuild{min-width:26px;width:26px!important}.mediaRow>.mediaDelete{width:30px!important;margin:0!important;padding:3px!important;text-align:center!important;font-size:17px;background:#24171b;border-color:#51303a}.mediaFilterEmpty{padding:8px;color:#7f8795;text-align:center}';document.head.appendChild(style)}
  const controls=document.createElement('div');controls.className='mediaLibraryTools';controls.innerHTML='<input id="mediaSearch" type="search" placeholder="Buscar medios…" aria-label="Buscar medios"><select id="mediaTypeFilter" aria-label="Filtrar medios"><option value="all">Todos</option><option value="video">Video</option><option value="image">Imagen</option><option value="audio">Audio</option></select><span id="mediaCount"></span><div class="mediaStorageActions"><button id="cleanupUnusedMedia" type="button" title="Elimina de IndexedDB los medios que no usa ningún clip">Limpiar no usados</button><button id="cleanupProxyCache" type="button" title="Libera solo proxies de preview; conserva originales y timeline">Liberar proxies</button><button id="restoreProxyCache" type="button" title="Vuelve a permitir proxies automáticos para videos donde se liberó la caché">Regenerar proxies</button></div>';
  library.insertAdjacentElement('beforebegin',controls);
  const search=controls.querySelector('#mediaSearch'),filter=controls.querySelector('#mediaTypeFilter'),count=controls.querySelector('#mediaCount'),cleanup=controls.querySelector('#cleanupUnusedMedia'),cleanupProxies=controls.querySelector('#cleanupProxyCache'),restoreProxies=controls.querySelector('#restoreProxyCache');
  async function removeStoredAsset(id){
    if(typeof mediaStore!=='undefined'&&mediaStore?.delete){await mediaStore.delete(id);return mediaStore.storageAvailable}
    const d=await db();return new Promise((resolve,reject)=>{const tx=d.transaction(STORE,'readwrite');tx.objectStore(STORE).delete(id);tx.oncomplete=()=>{d.close?.();resolve(true)};tx.onerror=()=>{d.close?.();reject(tx.error)}})
  }
  function proxyState(asset){
    const engine=window.ProfitMenteMediaProxies?.engine||window.ProfitMenteMediaProxyEngine;
    if(engine?.status)return engine.status(asset);
    if(asset?.type!=='video')return 'not-video';if(asset?.proxyStatus==='generating')return 'generating';if(asset?.proxyStatus==='error')return 'error';if(asset?.proxyAutoDisabled)return 'disabled';if(asset?.previewBlob instanceof Blob&&asset.previewBlob.size>0)return 'ready';return 'pending'
  }
  function refreshProxyActions(box,asset){
    if(!box||asset?.type!=='video')return;const main=box.querySelector('.mediaProxyToggle'),rebuild=box.querySelector('.mediaProxyRebuild'),state=proxyState(asset);
    const labels={generating:'Proxy…',ready:'Proxy ✓',disabled:'Original',error:'Proxy ⚠',pending:'Crear proxy','not-needed':'Directo'};
    main.textContent=labels[state]||'Proxy';main.disabled=state==='generating';main.dataset.state=state;
    main.title=state==='ready'?'Preview usando proxy local. Pulsa para usar el original.':state==='disabled'?'Preview usando original. Pulsa para generar y volver a usar proxy.':state==='error'?`Falló el proxy: ${asset.proxyError||'error local'}. Pulsa para reintentar.`:state==='not-needed'?'Este video puede reproducirse directamente. Pulsa si quieres crear un proxy manual.':state==='generating'?'Generando proxy local con FFmpeg…':'Crear proxy local para un preview más ligero.';
    rebuild.hidden=state!=='ready'&&state!=='error';rebuild.disabled=state==='generating';rebuild.title='Reconstruir este proxy desde el original';
  }
  function createProxyActions(asset){
    if(asset?.type!=='video')return null;const box=document.createElement('div');box.className='mediaProxyActions';box.innerHTML='<button type="button" class="mediaProxyToggle"></button><button type="button" class="mediaProxyRebuild" aria-label="Reconstruir proxy">↻</button>';
    const main=box.querySelector('.mediaProxyToggle'),rebuild=box.querySelector('.mediaProxyRebuild');
    const run=async mode=>{
      const proxies=window.ProfitMenteMediaProxies;if(!proxies){setStatus?.('El motor de proxies todavía no está listo');return}
      main.disabled=true;rebuild.disabled=true;
      try{
        const state=proxyState(asset);
        if(mode==='rebuild'||state==='error'||state==='not-needed'||state==='pending')await proxies.rebuildAsset?.(asset);
        else if(state==='ready')await proxies.disableAsset?.(asset);
        else if(state==='disabled')await proxies.enableAsset?.(asset,{rebuild:true});
        drawLibrary?.();cleanupStats();
        const now=proxyState(asset);setStatus?.(now==='ready'?`Proxy listo para ${asset.name} · el render seguirá usando el original`:now==='disabled'?`${asset.name}: preview usando el original`:`Proxy actualizado para ${asset.name}`)
      }catch(err){console.error(err);setStatus?.('No se pudo actualizar el proxy: '+(err?.message||err));refreshProxyActions(box,asset)}
    };
    main.onclick=e=>{e.preventDefault();e.stopPropagation();run('toggle')};rebuild.onclick=e=>{e.preventDefault();e.stopPropagation();run('rebuild')};refreshProxyActions(box,asset);return box
  }
  function cleanupStats(){
    const unused=tools.unused(project,assets),bytes=tools.unusedBytes(project,assets),proxyAssets=tools.proxyAssets(assets),proxyBytes=tools.proxyBytes(assets),suppressed=tools.suppressedProxyAssets(assets);
    cleanup.disabled=!unused.length;cleanup.textContent=unused.length?`Limpiar ${unused.length} no usado${unused.length===1?'':'s'}`:'Sin sobrantes';cleanup.title=unused.length?`Liberar aproximadamente ${(bytes/1048576).toFixed(1)} MB entre originales y proxies que no están en el timeline`:'Todos los medios están en uso';
    cleanupProxies.disabled=!proxyAssets.length;cleanupProxies.textContent=proxyAssets.length?`Liberar proxies · ${(proxyBytes/1048576).toFixed(1)} MB`:'Sin proxies';cleanupProxies.title=proxyAssets.length?`Eliminar solo ${proxyAssets.length} proxy(s) de preview. Los originales permanecen intactos y no se recrearán automáticamente hasta que lo pidas.`:'No hay proxies de preview almacenados';
    restoreProxies.disabled=!suppressed.length;restoreProxies.textContent=suppressed.length?`Regenerar ${suppressed.length} proxy${suppressed.length===1?'':'s'}`:'Proxies automáticos';restoreProxies.title=suppressed.length?`Volver a habilitar y regenerar proxies de preview para ${suppressed.length} video(s)`:'No hay proxies desactivados manualmente';
  }
  function applyFilter(){
    const allowed=new Set(tools.filter(assets,search.value,filter.value).map(a=>tools.mediaKey(a?.id)).filter(key=>key!==null));
    let visible=0;library.querySelectorAll('.mediaRow[data-asset-id]').forEach(row=>{const show=allowed.has(tools.mediaKey(row.dataset.assetId));row.hidden=!show;if(show)visible++});
    count.textContent=`${visible}/${assets.length}`;
    if(!visible&&assets.length){let empty=library.querySelector('.mediaFilterEmpty');if(!empty){empty=document.createElement('small');empty.className='mediaFilterEmpty';empty.textContent='Sin coincidencias';library.appendChild(empty)}empty.hidden=false}else{const empty=library.querySelector('.mediaFilterEmpty');if(empty)empty.hidden=true}
    cleanupStats();
  }
  function enhanceRows(){
    [...library.querySelectorAll(':scope > .mediaCard')].forEach((card,index)=>{
      const asset=assets[index];if(!asset)return;
      const row=document.createElement('div');row.className='mediaRow';row.dataset.assetId=String(asset.id??'');
      card.parentNode.insertBefore(row,card);row.appendChild(card);const proxyActions=createProxyActions(asset);if(proxyActions)row.appendChild(proxyActions);
      const del=document.createElement('button');del.type='button';del.className='mediaDelete';del.textContent='×';del.title=`Eliminar ${asset.name} de la biblioteca`;
      del.onclick=async e=>{e.preventDefault();e.stopPropagation();const used=tools.usage(project,asset.id);const msg=used.length?`Este medio se usa en ${used.length} clip(s). Si lo eliminas, esos clips quedarán marcados como medio faltante y podrás reconectarlo después. ¿Eliminar ${asset.name}?`:`¿Eliminar ${asset.name} de la biblioteca local?`;if(!confirm(msg))return;
        try{if(used.length)tools.preserveMeta(project,asset);else tools.pruneProjectAssetMeta(project,[asset.id]);const persisted=await removeStoredAsset(asset.id);if(asset.url?.startsWith?.('blob:'))URL.revokeObjectURL(asset.url);assets=assets.filter(a=>a!==asset);persist?.();drawLibrary();drawTimeline?.();renderAt?.(+document.querySelector('#playhead')?.value||0);setStatus?.(persisted?(used.length?`Medio eliminado · ${used.length} clip(s) requieren reconexión`:'Medio eliminado de la biblioteca'):'Medio eliminado de esta sesión · se sincronizará cuando vuelva el almacenamiento')}
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
      let persisted=true;for(const asset of unused){persisted=(await removeStoredAsset(asset.id))&&persisted;if(asset.url?.startsWith?.('blob:'))URL.revokeObjectURL(asset.url)}
      const removedAssets=new Set(unused);const ids=unused.map(asset=>asset.id);assets=assets.filter(a=>!removedAssets.has(a));tools.pruneProjectAssetMeta(project,ids);persist?.();drawLibrary();drawTimeline?.();setStatus?.(persisted?`Limpieza completada · ${ids.length} medio(s) eliminados · ${(bytes/1048576).toFixed(1)} MB liberables`:`Limpieza aplicada a la sesión · ${ids.length} medio(s) · se sincronizará cuando vuelva el almacenamiento`)
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
  document.addEventListener('profitmente:media-proxy-status',e=>{const asset=assets.find(a=>tools.sameMediaId(a?.id,e.detail?.assetId));if(!asset)return;library.querySelectorAll('.mediaRow[data-asset-id]').forEach(row=>{if(tools.sameMediaId(row.dataset.assetId,asset.id))refreshProxyActions(row.querySelector('.mediaProxyActions'),asset)});cleanupStats()});
  enhanceRows();window.profitMenteMediaLibraryTools=tools;
  if(!document.querySelector('script[data-profitmente-media-import]')){const s=document.createElement('script');s.src='media-import-engine.js';s.dataset.profitmenteMediaImport='1';document.body.appendChild(s)}
})();
