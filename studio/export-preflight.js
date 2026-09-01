(()=>{
  const root=typeof window!=='undefined'?window:globalThis;
  class ProfitMenteExportPreflight{
    static summarize(qa,health){
      qa=qa||{ok:false,score:0,issues:['QA no disponible'],warnings:[],metrics:{}};health=health||{ok:false,render_ready:false};
      const issues=[...(qa.issues||[])],warnings=[...(qa.warnings||[])];
      let state='ready',label='Listo para exportar';
      if(issues.length){state='blocked';label=`Exportación bloqueada · ${issues.length} error${issues.length===1?'':'es'}`}
      else if(!health.ok){state='package';label='Proyecto válido · MP4 directo inactivo'}
      else if(!health.render_ready){state='package';label='Proyecto válido · falta FFmpeg para MP4 directo'}
      else if(warnings.length){state='warning';label=`Listo con ${warnings.length} advertencia${warnings.length===1?'':'s'}`}
      return {state,label,canPackage:issues.length===0,canRender:issues.length===0&&!!health.render_ready,score:Number(qa.score)||0,issues,warnings,metrics:qa.metrics||{},health};
    }
  }
  root.ProfitMenteExportPreflight=ProfitMenteExportPreflight;
  if(typeof module!=='undefined'&&module.exports)module.exports=ProfitMenteExportPreflight;
  if(typeof document==='undefined')return;
  const $=s=>document.querySelector(s),qaEngine=new ProfitMenteQAEngine(),bundleEngine=new ProfitMenteBundleEngine();
  const qaBtn=$('#qaBtn');if(!qaBtn)return;
  let btn=$('#preflightBtn');if(!btn){btn=document.createElement('button');btn.id='preflightBtn';btn.textContent='🚦 Preflight export';btn.title='Comprobar proyecto, medios y disponibilidad del render local';qaBtn.after(btn)}
  let report=$('#preflightReport');if(!report){report=document.createElement('div');report.id='preflightReport';report.className='status preflightReport';report.hidden=true;const status=$('#status');status?.after(report)}
  async function run(snapshot){
    btn.disabled=true;try{
      const hasSnapshot=!!snapshot&&typeof snapshot==='object'&&!!snapshot.project;
      if(!hasSnapshot&&typeof save==='function')save();
      const qaProject=hasSnapshot?snapshot.project:project;
      const qaAssets=hasSnapshot&&Array.isArray(snapshot.assets)?snapshot.assets:assets;
      const qa=qaEngine.inspect(qaProject,qaAssets),health=await bundleEngine.health(),r=ProfitMenteExportPreflight.summarize(qa,health);
      report.hidden=false;report.dataset.state=r.state;
      const render=r.canRender?'MP4 directo ✓':r.canPackage?'Paquete ✓ · MP4 directo no disponible':'MP4 bloqueado';
      const metrics=r.metrics||{};
      report.innerHTML=`<b>${r.label}</b><br>QA ${r.score}/100 · ${render}<br>Visual ${metrics.visualCoverage??0}% · Captions ${metrics.captionCoverage??0}% · ${metrics.clips??0} clips${r.issues.length?'<br>❌ '+r.issues.slice(0,3).join('<br>❌ '):r.warnings.length?'<br>⚠️ '+r.warnings.slice(0,3).join('<br>⚠️ '):'<br>Sin bloqueos detectados.'}`;
      if(typeof setStatus==='function')setStatus(r.canRender?'Preflight completo: listo para MP4':r.canPackage?'Preflight completo: proyecto exportable como paquete':'Preflight: corrige los errores antes de exportar');
      return r;
    }finally{btn.disabled=false}
  }
  btn.onclick=()=>run();root.ProfitMenteExportPreflightRun=run;
})();
