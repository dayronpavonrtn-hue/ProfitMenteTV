(function(){
  if(typeof document==='undefined'||typeof drawLibrary!=='function'||typeof assets==='undefined')return;
  const tools=globalThis.ProfitMenteMediaLibraryTools;
  if(!tools||typeof tools.crossProjectUsage!=='function')return;

  function assetForRow(row){
    const id=row?.dataset?.assetId;
    if(id===undefined||id===null)return null;
    if(typeof tools.sameMediaId==='function')return (assets||[]).find(asset=>tools.sameMediaId(asset?.id,id))||null;
    return (assets||[]).find(asset=>String(asset?.id??'')===String(id))||null;
  }

  function protectDeleteButtons(){
    document.querySelectorAll('.mediaRow[data-asset-id] .mediaDelete').forEach(button=>{
      if(button.dataset.crossProjectGuard==='1')return;
      const original=button.onclick;
      if(typeof original!=='function')return;
      button.dataset.crossProjectGuard='1';
      button.onclick=async function(event){
        const row=button.closest('.mediaRow[data-asset-id]'),asset=assetForRow(row);
        if(!asset)return original.call(this,event);
        const usage=tools.crossProjectUsage(project,asset.id);
        if(!usage?.available){
          event?.preventDefault?.();event?.stopPropagation?.();
          if(typeof setStatus==='function')setStatus('Eliminación bloqueada: no se pudo verificar si otros proyectos usan este medio');
          return false;
        }
        if(usage.otherProjects?.length){
          event?.preventDefault?.();event?.stopPropagation?.();
          const count=usage.otherProjects.length,clips=usage.otherClips?.length||0;
          if(typeof setStatus==='function')setStatus(`Medio protegido · usado por ${count} proyecto${count===1?'':'s'} guardado${count===1?'':'s'} (${clips} clip${clips===1?'':'s'})`);
          return false;
        }
        return original.call(this,event);
      };
    });
  }

  const baseDraw=drawLibrary;
  drawLibrary=function(){baseDraw();protectDeleteButtons()};
  protectDeleteButtons();
  globalThis.ProfitMenteMediaLibraryDeleteGuard={refresh:protectDeleteButtons};
})();
