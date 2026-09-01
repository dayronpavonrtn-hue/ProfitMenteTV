(function integrateOfflineMedia(){
  if(typeof document==='undefined'||typeof project==='undefined'||typeof assets==='undefined'||!window.ProfitMenteOfflineMediaEngine||window.ProfitMenteOfflineMedia)return;
  const engine=window.ProfitMenteOfflineMediaEngine,$=s=>document.querySelector(s),library=$('#mediaLibrary');if(!library)return;
  const host=library.parentElement||library,badge=document.createElement('button');badge.type='button';badge.id='profitmenteOfflineMediaStatus';badge.hidden=true;badge.style.cssText='width:100%;margin:6px 0;padding:7px 8px;border:1px solid #8b3b3b;border-radius:6px;background:#2a1717;color:#ffd7d7;cursor:pointer;font-size:11px;text-align:left';host.insertBefore(badge,library);
  function titleFor(item){const label=engine.label(item.reason);return `⚠ ${label}: ${item.clipName}${item.assetName?` · ${item.assetName}`:''}`}
  function decorate(report){
    document.querySelectorAll('.clip[data-id]').forEach(el=>{el.classList.remove('offline-media');el.removeAttribute('data-offline-media');if(el.dataset.profitmenteOfflineTitle){el.title=el.dataset.profitmenteOfflineTitle;delete el.dataset.profitmenteOfflineTitle}});
    for(const item of report.offline){if(!item.clipId)continue;const el=document.querySelector(`.clip[data-id="${CSS.escape(item.clipId)}"]`);if(!el)continue;if(el.title)el.dataset.profitmenteOfflineTitle=el.title;el.classList.add('offline-media');el.dataset.offlineMedia=item.reason;el.title=titleFor(item);el.style.outline='2px solid #d95555';el.style.outlineOffset='-2px'}
  }
  function refresh({announce=false}={}){
    const report=engine.audit(project,assets);decorate(report);
    if(report.offline.length){badge.hidden=false;badge.textContent=`⚠ ${report.offline.length} clip(s) con medios offline${report.blocking.length?` · ${report.blocking.length} bloquean exportación`:''} · clic para revincular`;badge.title=report.offline.map(titleFor).join('\n')}else{badge.hidden=true;badge.textContent='';badge.title=''}
    if(announce&&report.offline.length&&typeof setStatus==='function')setStatus(`${report.offline.length} clip(s) con medios offline · usa Revincular medios`);
    window.dispatchEvent(new CustomEvent('profitmente:offline-media-audit',{detail:report}));return report;
  }
  badge.onclick=()=>{const button=window.ProfitMenteMediaRelink?.button||$('#profitmenteRelinkButton');if(button)button.click();else if(typeof setStatus==='function')setStatus('Carga o revincula los archivos originales para recuperar estos clips')};
  const baseDraw=typeof drawTimeline==='function'?drawTimeline:null;if(baseDraw)drawTimeline=function(){const value=baseDraw.apply(this,arguments);queueMicrotask(()=>refresh());return value};
  ['profitmente:project-opened','profitmente:media-relinked','profitmente:features-ready'].forEach(name=>window.addEventListener(name,()=>refresh({announce:name==='profitmente:project-opened'})));
  document.addEventListener('profitmente:media-imported',()=>refresh());
  refresh();window.ProfitMenteOfflineMedia={engine,refresh,get report(){return engine.audit(project,assets)}};
})();
