(()=>{
  const root=typeof window!=='undefined'?window:globalThis;
  class ProfitMenteRenderQAGuard{
    inspect(engine,project,assets){
      if(!engine||typeof engine.inspect!=='function')return {ok:false,issues:['Motor QA no disponible'],warnings:[]};
      try{const report=engine.inspect(project,Array.isArray(assets)?assets:[]);if(!report||typeof report!=='object')return {ok:false,issues:['QA no produjo un reporte válido'],warnings:[]};return report}catch(error){return {ok:false,issues:['QA falló antes del render: '+(error?.message||String(error))],warnings:[]}}
    }
    blocked(report){return !report||typeof report!=='object'||(Array.isArray(report.issues)&&report.issues.length>0)||report.ok!==true}
  }
  root.ProfitMenteRenderQAGuard=ProfitMenteRenderQAGuard;
  if(typeof document==='undefined')return;

  const guard=new ProfitMenteRenderQAGuard();
  function wireFallback(){
    const button=document.querySelector('#renderBtn');
    if(!button||button.dataset.qaGuard==='1')return false;
    // The advanced renderer owns WebM once feature-bootstrap has loaded it. Never
    // replace it with the legacy fallback: doing so would silently lose render
    // locking, cancellation, export dimensions, bitrate presets and post-render QC.
    if(root.ProfitMenteWebMRender?.run){button.dataset.qaGuard='advanced';return true}
    const fallback=button.onclick;if(typeof fallback!=='function')return false;
    button.dataset.qaGuard='1';
    button.onclick=async function(event){
      if(button.disabled)return;
      if(typeof save==='function')save();
      const report=guard.inspect(typeof qa!=='undefined'?qa:null,typeof project!=='undefined'?project:null,typeof assets!=='undefined'?assets:[]);
      if(guard.blocked(report)){if(typeof setStatus==='function')setStatus('Render WebM bloqueado: corrige primero los errores de QA');document.querySelector('#qaBtn')?.click();return}
      // Keep this path intentionally minimal. It only protects the original app.js
      // renderer when advanced features failed to load.
      button.disabled=true;
      try{return await fallback.call(this,event)}finally{button.disabled=false}
    };
    return true;
  }

  // feature-bootstrap loads the production WebM renderer asynchronously. Waiting
  // for its completion removes the race where this guard could overwrite that
  // renderer depending on cache/network timing.
  if(root.__profitmenteFeatureBootstrap){
    root.addEventListener('profitmente:features-ready',wireFallback,{once:true});
    queueMicrotask(()=>{if(root.ProfitMenteWebMRender?.run)wireFallback()});
  }else wireFallback();
})();
