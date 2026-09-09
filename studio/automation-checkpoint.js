(()=>{
  if(typeof document==='undefined')return;
  function ensureRenderMediaPruner(){
    if(window.ProfitMenteRenderMediaPruner)return;
    if([...document.scripts].some(s=>s.src?.endsWith('/render-media-pruner.js')||s.src?.endsWith('render-media-pruner.js')))return;
    const s=document.createElement('script');s.src='render-media-pruner.js';s.async=false;
    s.onerror=()=>console.error('ProfitMente Studio: no se pudo cargar la optimización de medios de render');
    document.body.appendChild(s);
  }
  ensureRenderMediaPruner();
  function ensureGeneratorTransactionGuard(){
    if(window.ProfitMenteGeneratorTransactionIntegration)return;
    if([...document.scripts].some(s=>s.src?.endsWith('/generator-transaction-guard.js')||s.src?.endsWith('generator-transaction-guard.js')))return;
    const s=document.createElement('script');s.src='generator-transaction-guard.js';s.async=false;
    s.onerror=()=>console.error('ProfitMente Studio: no se pudo cargar la protección transaccional del generador');
    document.body.appendChild(s);
  }
  ensureGeneratorTransactionGuard();
  function ensureRenderQueue(){
    if(window.ProfitMenteRenderQueue)return;
    const integrationLoaded=()=>[...document.scripts].some(s=>s.src?.endsWith('/render-queue-integration.js')||s.src?.endsWith('render-queue-integration.js'));
    const loadIntegration=()=>{
      if(window.ProfitMenteRenderQueue||integrationLoaded())return;
      const integration=document.createElement('script');integration.src='render-queue-integration.js';integration.async=false;integration.dataset.profitmenteRenderQueue='1';
      integration.onerror=()=>console.error('ProfitMente Studio: no se pudo integrar la cola de render MP4');document.body.appendChild(integration);
    };
    if(window.ProfitMenteRenderQueueEngine){loadIntegration();return}
    if([...document.scripts].some(s=>s.src?.endsWith('/render-queue-engine.js')||s.src?.endsWith('render-queue-engine.js'))){setTimeout(ensureRenderQueue,40);return}
    const engine=document.createElement('script');engine.src='render-queue-engine.js';engine.async=false;engine.dataset.profitmenteRenderQueue='1';engine.onload=loadIntegration;
    engine.onerror=()=>console.error('ProfitMente Studio: no se pudo cargar la cola de render MP4');document.body.appendChild(engine);
  }
  ensureRenderQueue();
  function ensureStartupRecoveryNotice(){
    if(!window.__profitmenteStartupRecovered||window.ProfitMenteStartupRecoveryNotice)return;
    if([...document.scripts].some(s=>s.src?.endsWith('/startup-recovery-notice.js')||s.src?.endsWith('startup-recovery-notice.js')))return;
    const s=document.createElement('script');s.src='startup-recovery-notice.js';s.async=false;
    s.onerror=()=>console.error('ProfitMente Studio: no se pudo cargar el aviso de recuperación automática');
    document.body.appendChild(s);
  }
  ensureStartupRecoveryNotice();
  function boot(){
    const engine=window.profitMenteProjectVersionEngine;
    if(!engine||typeof project==='undefined'){setTimeout(boot,80);return}
    const status=t=>typeof setStatus==='function'&&setStatus(t);
    const specs={
      generateBtn:'Antes de generar automáticamente',
      sceneBtn:'Antes de generar estructura',
      captionBtn:'Antes de regenerar subtítulos',
      brollBtn:'Antes de generar B-roll',
      autoFinishBtn:'Antes de Auto Finish',
      autoFinishRenderBtn:'Antes de Auto Finish + render MP4',
      qaFixBtn:'Antes de reparación QA',
      safeAreaFixBtn:'Antes de ajustar zona segura',
      visualGapFillBtn:'Antes de completar huecos',
      clearBtn:'Antes de crear proyecto nuevo'
    };
    function checkpoint(label){
      try{
        if(typeof save==='function')save();
        const r=engine.createIfChanged(project,label);
        if(r.created)window.dispatchEvent(new CustomEvent('profitmente:checkpoint-created',{detail:{label,id:r.row.id,automatic:true}}));
        return r;
      }catch(err){console.warn('No se pudo crear checkpoint automático',err);return {created:false,error:err}}
    }
    function wire(){
      for(const [id,label] of Object.entries(specs)){
        const el=document.getElementById(id);if(!el||el.dataset.autoCheckpoint==='1')continue;
        el.dataset.autoCheckpoint='1';el.addEventListener('click',()=>checkpoint(label),{capture:true});
      }
      for(const [id,label] of [['projectInput','Antes de importar proyecto'],['bundleInput','Antes de abrir paquete completo']]){
        const el=document.getElementById(id);if(!el||el.dataset.autoCheckpoint==='1')continue;
        el.dataset.autoCheckpoint='1';el.addEventListener('change',e=>{if(e.target?.files?.length)checkpoint(label)},{capture:true});
      }
    }
    wire();
    const observer=new MutationObserver(wire);observer.observe(document.body,{childList:true,subtree:true});
    window.addEventListener('profitmente:checkpoint-created',()=>{document.getElementById('versionRefreshBtn')?.click()});
    window.profitMenteAutomationCheckpoint={checkpoint,wire,observer};
    status('Protección automática de versiones activa');
  }
  boot();
})();