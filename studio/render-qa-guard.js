(()=>{
  const root=typeof window!=='undefined'?window:globalThis;
  class ProfitMenteRenderQAGuard{
    inspect(engine,project,assets){
      if(!engine||typeof engine.inspect!=='function')return {ok:false,issues:['Motor QA no disponible'],warnings:[]};
      try{
        const report=engine.inspect(project,Array.isArray(assets)?assets:[]);
        if(!report||typeof report!=='object')return {ok:false,issues:['QA no produjo un reporte válido'],warnings:[]};
        return report;
      }catch(error){
        return {ok:false,issues:['QA falló antes del render: '+(error?.message||String(error))],warnings:[]};
      }
    }
    blocked(report){
      if(!report||typeof report!=='object')return true;
      if(Array.isArray(report.issues)&&report.issues.length)return true;
      return report.ok!==true;
    }
  }
  root.ProfitMenteRenderQAGuard=ProfitMenteRenderQAGuard;
  if(typeof document==='undefined')return;
  const button=document.querySelector('#renderBtn');
  if(!button||button.dataset.qaGuard==='1')return;
  const original=button.onclick;
  if(typeof original!=='function')return;
  const guard=new ProfitMenteRenderQAGuard();
  button.dataset.qaGuard='1';
  button.onclick=async function(event){
    if(button.disabled)return;
    if(typeof save==='function')save();
    const engine=typeof qa!=='undefined'?qa:null;
    const report=guard.inspect(engine,typeof project!=='undefined'?project:null,typeof assets!=='undefined'?assets:[]);
    if(guard.blocked(report)){
      if(typeof setStatus==='function')setStatus('Render WebM bloqueado: corrige primero los errores de QA');
      const qaButton=document.querySelector('#qaBtn');
      if(qaButton&&typeof qaButton.click==='function')qaButton.click();
      return;
    }
    button.disabled=true;
    try{return await original.call(this,event)}finally{button.disabled=false}
  };
})();
