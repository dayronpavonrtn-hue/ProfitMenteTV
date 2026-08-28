(function integrateMediaReplacement(){
  if(typeof document==='undefined'||typeof ProfitMenteMediaReplaceEngine==='undefined')return;
  const engine=ProfitMenteMediaReplaceEngine;
  if(!document.querySelector('#profitmenteMediaReplaceStyle')){
    const style=document.createElement('style');style.id='profitmenteMediaReplaceStyle';
    style.textContent='.mediaRow.mediaReplaceReady{grid-template-columns:1fr 30px 30px}.mediaReplace{width:30px!important;margin:0!important;padding:3px!important;text-align:center!important;font-size:14px;background:#142029;border-color:#305166}.mediaReplace:disabled{opacity:.35;cursor:not-allowed}.mediaReplaceHint{font-size:9px;color:#7ad7ff;margin:4px 0 0}';document.head.appendChild(style);
  }
  const library=document.querySelector('#mediaLibrary');if(!library)return;
  function selectedClip(){const id=window.ProfitMenteEditTools?.selectedId;return (project?.clips||[]).find(c=>c?.id===id)||null}
  function assetForRow(row){return (assets||[]).find(a=>a?.id===row?.dataset?.assetId)||null}
  async function replaceWith(asset){
    const clip=selectedClip();if(!clip){setStatus?.('Selecciona primero un clip del timeline');return}
    const result=engine.replace(project,clip.id,asset);
    if(!result.ok){
      const msg=result.reason==='incompatible'?'Ese medio no es compatible con la pista del clip seleccionado':'No se pudo reemplazar el medio';
      setStatus?.(msg);return;
    }
    if(typeof persist==='function')persist();
    if(typeof drawTimeline==='function')drawTimeline();
    if(typeof renderAt==='function')await renderAt(+document.querySelector('#playhead')?.value||0);
    window.ProfitMenteEditTools?.select?.(clip.id);
    setStatus?.(`${asset.name} reemplazó el medio del clip${result.trimmed?' · duración ajustada al archivo nuevo':''}`);
  }
  function enhance(){
    library.querySelectorAll('.mediaRow[data-asset-id]').forEach(row=>{
      if(row.querySelector('.mediaReplace'))return;
      row.classList.add('mediaReplaceReady');const asset=assetForRow(row);
      const btn=document.createElement('button');btn.type='button';btn.className='mediaReplace';btn.textContent='↻';btn.title=`Reemplazar el medio del clip seleccionado con ${asset?.name||'este archivo'}`;
      btn.onclick=e=>{e.preventDefault();e.stopPropagation();if(asset)replaceWith(asset)};row.appendChild(btn);
    });
  }
  const observer=new MutationObserver(enhance);observer.observe(library,{childList:true,subtree:true});enhance();
  document.addEventListener('click',e=>{if(e.target.closest?.('.clip'))requestAnimationFrame(enhance)},true);
  window.profitMenteMediaReplace={replaceWith,engine};
})();
