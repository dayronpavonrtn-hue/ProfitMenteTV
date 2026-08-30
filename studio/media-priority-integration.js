(function(){
  if(typeof document==='undefined'||typeof assets==='undefined'||typeof drawLibrary!=='function'||typeof ProfitMenteMediaPriorityEngine==='undefined')return;
  const engine=ProfitMenteMediaPriorityEngine;
  if(!document.querySelector('#profitmenteMediaPriorityStyle')){
    const style=document.createElement('style');style.id='profitmenteMediaPriorityStyle';style.textContent='.mediaRow{grid-template-columns:30px minmax(0,1fr) 30px!important}.mediaPriorityStar{width:30px!important;margin:0!important;padding:3px!important;font-size:16px;background:#171b24;border-color:#343b49}.mediaPriorityStar.active{background:#332b12;border-color:#8a7428}.mediaCard.mediaPreferred{outline:1px solid rgba(255,230,109,.45);outline-offset:-1px}';document.head.appendChild(style);
  }
  async function toggle(asset,button,card){
    const value=engine.toggle(asset);button.classList.toggle('active',value);button.textContent=value?'★':'☆';button.title=value?'Quitar prioridad automática':'Priorizar este medio en el generador automático';card?.classList.toggle('mediaPreferred',value);
    try{if(typeof putAsset==='function')await putAsset(asset);if(window.ProfitMenteMediaLibraryTools?.preserveMeta){window.ProfitMenteMediaLibraryTools.preserveMeta(project,asset)}persist?.();setStatus?.(value?`${asset.name} tendrá prioridad en la selección automática`:`Prioridad automática quitada de ${asset.name}`)}catch(err){engine.setPreferred(asset,!value);console.error(err);setStatus?.('No se pudo guardar la prioridad del medio')}
  }
  function decorate(){
    const library=document.querySelector('#mediaLibrary');if(!library)return;
    const rows=[...library.querySelectorAll('.mediaRow[data-asset-id]')];
    if(rows.length){
      for(const row of rows){if(row.querySelector('.mediaPriorityStar'))continue;const asset=assets.find(a=>a.id===row.dataset.assetId);if(!asset)continue;const card=row.querySelector('.mediaCard');const star=document.createElement('button');star.type='button';star.className='mediaPriorityStar'+(engine.isPreferred(asset)?' active':'');star.textContent=engine.isPreferred(asset)?'★':'☆';star.title=engine.isPreferred(asset)?'Quitar prioridad automática':'Priorizar este medio en el generador automático';star.onclick=e=>{e.preventDefault();e.stopPropagation();toggle(asset,star,card)};row.insertBefore(star,row.firstChild);card?.classList.toggle('mediaPreferred',engine.isPreferred(asset))}
      return;
    }
    [...library.querySelectorAll('.mediaCard')].forEach((card,index)=>{const asset=assets[index];if(!asset||card.dataset.priorityReady)return;card.dataset.priorityReady='1';card.classList.toggle('mediaPreferred',engine.isPreferred(asset));card.title+=(engine.isPreferred(asset)?' · Prioridad automática':'')});
  }
  const baseDraw=drawLibrary;drawLibrary=function(){baseDraw();decorate()};decorate();
  window.ProfitMenteMediaPriority={engine,decorate};
})();
