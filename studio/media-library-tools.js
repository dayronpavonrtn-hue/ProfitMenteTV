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
  static preserveMeta(project,asset){
    if(!project||!asset?.id)return project;
    const keys=['id','name','type','mime','size','duration','width','height','metadataVersion'],meta={};
    for(const k of keys)if(asset[k]!==undefined&&asset[k]!==null)meta[k]=asset[k];
    const list=Array.isArray(project.assets)?project.assets:[];
    const i=list.findIndex(a=>a?.id===asset.id);
    if(i>=0)list[i]={...list[i],...meta};else list.push(meta);
    project.assets=list;return project;
  }
}
if(typeof window!=='undefined')window.ProfitMenteMediaLibraryTools=ProfitMenteMediaLibraryTools;
if(typeof module!=='undefined'&&module.exports)module.exports=ProfitMenteMediaLibraryTools;

(function integrateMediaLibraryTools(){
  if(typeof document==='undefined'||typeof assets==='undefined'||typeof drawLibrary!=='function')return;
  const library=document.querySelector('#mediaLibrary');if(!library)return;
  const tools=ProfitMenteMediaLibraryTools;
  if(!document.querySelector('#profitmenteMediaLibraryToolsStyle')){const style=document.createElement('style');style.id='profitmenteMediaLibraryToolsStyle';style.textContent='.mediaLibraryTools{display:grid;grid-template-columns:1fr 82px auto;gap:5px;align-items:center;margin:8px 0 4px}.mediaLibraryTools input,.mediaLibraryTools select{min-width:0;padding:7px 8px;font-size:10px}.mediaLibraryTools span{font-size:9px;color:#8e96a5}.mediaRow{display:grid;grid-template-columns:1fr 30px;gap:5px;align-items:stretch}.mediaRow>.mediaCard{width:100%;margin:0}.mediaRow>.mediaDelete{width:30px!important;margin:0!important;padding:3px!important;text-align:center!important;font-size:17px;background:#24171b;border-color:#51303a}.mediaFilterEmpty{padding:8px;color:#7f8795;text-align:center}';document.head.appendChild(style)}
  const controls=document.createElement('div');controls.className='mediaLibraryTools';controls.innerHTML='<input id="mediaSearch" type="search" placeholder="Buscar medios…" aria-label="Buscar medios"><select id="mediaTypeFilter" aria-label="Filtrar medios"><option value="all">Todos</option><option value="video">Video</option><option value="image">Imagen</option><option value="audio">Audio</option></select><span id="mediaCount"></span>';
  library.insertAdjacentElement('beforebegin',controls);
  const search=controls.querySelector('#mediaSearch'),filter=controls.querySelector('#mediaTypeFilter'),count=controls.querySelector('#mediaCount');
  async function removeStoredAsset(id){
    const d=await db();return new Promise((resolve,reject)=>{const tx=d.transaction(STORE,'readwrite');tx.objectStore(STORE).delete(id);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)})
  }
  function applyFilter(){
    const allowed=new Set(tools.filter(assets,search.value,filter.value).map(a=>a.id));
    let visible=0;library.querySelectorAll('.mediaRow[data-asset-id]').forEach(row=>{const show=allowed.has(row.dataset.assetId);row.hidden=!show;if(show)visible++});
    count.textContent=`${visible}/${assets.length}`;
    if(!visible&&assets.length){let empty=library.querySelector('.mediaFilterEmpty');if(!empty){empty=document.createElement('small');empty.className='mediaFilterEmpty';empty.textContent='Sin coincidencias';library.appendChild(empty)}empty.hidden=false}else{const empty=library.querySelector('.mediaFilterEmpty');if(empty)empty.hidden=true}
  }
  function enhanceRows(){
    [...library.querySelectorAll(':scope > .mediaCard')].forEach((card,index)=>{
      const asset=assets[index];if(!asset)return;
      const row=document.createElement('div');row.className='mediaRow';row.dataset.assetId=asset.id;
      card.parentNode.insertBefore(row,card);row.appendChild(card);
      const del=document.createElement('button');del.type='button';del.className='mediaDelete';del.textContent='×';del.title=`Eliminar ${asset.name} de la biblioteca`;
      del.onclick=async e=>{e.preventDefault();e.stopPropagation();const used=tools.usage(project,asset.id);const msg=used.length?`Este medio se usa en ${used.length} clip(s). Si lo eliminas, esos clips quedarán marcados como medio faltante y podrás reconectarlo después. ¿Eliminar ${asset.name}?`:`¿Eliminar ${asset.name} de la biblioteca local?`;if(!confirm(msg))return;
        try{if(used.length)tools.preserveMeta(project,asset);await removeStoredAsset(asset.id);assets=assets.filter(a=>a.id!==asset.id);persist?.();drawLibrary();drawTimeline?.();renderAt?.(+document.querySelector('#playhead')?.value||0);setStatus?.(used.length?`Medio eliminado · ${used.length} clip(s) requieren reconexión`:'Medio eliminado de la biblioteca')}
        catch(err){console.error(err);setStatus?.('No se pudo eliminar el medio: '+(err?.message||err))}
      };
      row.appendChild(del);
    });
    applyFilter();
  }
  const baseDraw=drawLibrary;
  drawLibrary=function(){baseDraw();enhanceRows()};
  search.addEventListener('input',applyFilter);filter.addEventListener('change',applyFilter);
  enhanceRows();window.profitMenteMediaLibraryTools=tools;
})();
