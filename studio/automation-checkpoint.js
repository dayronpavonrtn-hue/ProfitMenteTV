(()=>{
  if(typeof document==='undefined'||typeof project==='undefined')return;
  function boot(){
    const engine=window.profitMenteProjectVersionEngine;
    if(!engine){setTimeout(boot,80);return}
    const status=t=>typeof setStatus==='function'&&setStatus(t);
    const specs={
      generateBtn:'Antes de generar automáticamente',
      sceneBtn:'Antes de generar estructura',
      captionBtn:'Antes de regenerar subtítulos',
      brollBtn:'Antes de generar B-roll',
      qaFixBtn:'Antes de reparación QA',
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
