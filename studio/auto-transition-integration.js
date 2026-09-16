(()=>{
  if(typeof document==='undefined'||!window.ProfitMenteAutoTransitionEngine||window.ProfitMenteAutoTransitions)return;
  const Engine=window.ProfitMenteAutoTransitionEngine,$=s=>document.querySelector(s),loads=new Map();
  function run(force=false){
    const result=Engine.apply(project,{force});
    if(result.changed){persist?.();drawTimeline?.();renderAt?.(+($('#playhead')?.value||0))}
    setStatus?.(`Transiciones auto · ${result.changed} ajustada(s)${result.cleared?` · ${result.cleared} inválida(s) limpiada(s)`:''}${result.preserved?` · ${result.preserved} manual(es) preservada(s)`:''}${result.locked?` · ${result.locked} bloqueada(s) respetada(s)`:''}${result.skipped?` · ${result.skipped} frontera(s) omitida(s)`:''}`);
    return result;
  }
  function install(){
    if($('#autoTransitionBtn'))return;const anchor=$('#autoFinishBtn')||$('#generateBtn')||$('#qaBtn');if(!anchor)return;
    const btn=document.createElement('button');btn.id='autoTransitionBtn';btn.type='button';btn.textContent='✨ Transiciones auto';btn.title='Aplica transiciones locales a escenas generadas contiguas sin sobrescribir ajustes manuales ni clips/pistas bloqueados.';btn.onclick=()=>run(false);anchor.insertAdjacentElement('afterend',btn);
  }
  function load(src,guard){
    if(guard&&window[guard])return Promise.resolve();
    if(loads.has(src))return loads.get(src);
    const promise=new Promise((resolve,reject)=>{
      let script=[...document.scripts].find(s=>s.src.endsWith('/'+src)||s.src.endsWith(src));
      let timeout;
      const cleanup=()=>{if(timeout)clearTimeout(timeout);script?.removeEventListener?.('load',onload);script?.removeEventListener?.('error',onerror)};
      const onload=()=>{script.dataset.pmLoaded='1';cleanup();guard&&!window[guard]?reject(new Error(src+' cargó sin exponer '+guard)):resolve()};
      const onerror=()=>{cleanup();loads.delete(src);reject(new Error('No se pudo cargar '+src))};
      if(script?.dataset?.pmLoaded==='1'){guard&&!window[guard]?onerror():resolve();return}
      if(script){
        script.addEventListener('load',onload,{once:true});script.addEventListener('error',onerror,{once:true});
        timeout=setTimeout(()=>{if(guard&&window[guard]){cleanup();resolve()}else onerror()},5000);
        return;
      }
      script=document.createElement('script');script.src=src;script.async=false;script.addEventListener('load',onload,{once:true});script.addEventListener('error',onerror,{once:true});document.body.appendChild(script);
    });
    loads.set(src,promise);promise.catch(()=>loads.delete(src));return promise;
  }
  async function installPreviewRenderer(){
    try{await load('transition-preview-engine.js','ProfitMenteTransitionPreviewEngine');await load('transition-preview-integration.js','ProfitMenteTransitionPreview')}catch(error){console.error(error);setStatus?.('Transiciones configuradas · preview visual no disponible')}
  }
  install();installPreviewRenderer();new MutationObserver(install).observe(document.body,{childList:true,subtree:true});
  window.ProfitMenteAutoTransitions={inspect:()=>Engine.inspect(project),run,force:()=>run(true)};
})();