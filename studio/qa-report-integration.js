(()=>{
  if(typeof document==='undefined')return;

  function normalizedReport(report){
    const r=report&&typeof report==='object'?report:{};
    const metrics=r.metrics&&typeof r.metrics==='object'?r.metrics:{};
    const issues=Array.isArray(r.issues)?r.issues:[];
    const warnings=Array.isArray(r.warnings)?r.warnings:[];
    const score=Number.isFinite(Number(r.score))?Math.max(0,Math.min(100,Number(r.score))):0;
    return {
      ok:!!r.ok,
      score,
      metrics:{
        visualCoverage:Number.isFinite(Number(metrics.visualCoverage))?Number(metrics.visualCoverage):0,
        captionCoverage:Number.isFinite(Number(metrics.captionCoverage))?Number(metrics.captionCoverage):0,
        clips:Number.isFinite(Number(metrics.clips))?Number(metrics.clips):0,
        assets:Number.isFinite(Number(metrics.assets))?Number(metrics.assets):0
      },
      issues:issues.map(value=>String(value)),
      warnings:warnings.map(value=>String(value))
    };
  }

  function reportLines(report){
    const r=normalizedReport(report);
    return [
      ...r.issues.map(text=>({kind:'issue',text:`❌ ${text}`})),
      ...r.warnings.map(text=>({kind:'warning',text:`⚠️ ${text}`}))
    ];
  }

  function renderReport(report,el){
    if(!el)return normalizedReport(report);
    const r=normalizedReport(report);
    el.hidden=false;
    el.replaceChildren();

    const title=document.createElement('b');
    title.textContent=`QA ${r.score}/100 ${r.ok?'✓':'✕'}`;
    el.appendChild(title);

    const metrics=document.createElement('div');
    metrics.textContent=`Visual ${r.metrics.visualCoverage}% · Captions ${r.metrics.captionCoverage}% · ${r.metrics.clips} clips · ${r.metrics.assets} medios`;
    el.appendChild(metrics);

    const lines=reportLines(r);
    if(lines.length){
      for(const line of lines){
        const row=document.createElement('div');
        row.dataset.qaKind=line.kind;
        row.textContent=line.text;
        el.appendChild(row);
      }
    }else{
      const row=document.createElement('div');
      row.textContent='Sin problemas estructurales detectados.';
      el.appendChild(row);
    }
    return r;
  }

  function inspectCurrent(){
    if(typeof qa==='undefined'||typeof qa?.inspect!=='function')throw new Error('Motor QA no disponible');
    if(typeof save==='function')save();
    const report=qa.inspect(typeof project!=='undefined'?project:null,typeof assets!=='undefined'?assets:[]);
    const normalized=renderReport(report,document.querySelector('#qaReport'));
    if(typeof setStatus==='function')setStatus(normalized.ok?'Control de calidad completado':'Corrige los errores marcados antes del render final');
    return normalized;
  }

  function wire(){
    const btn=document.querySelector('#qaBtn');
    if(!btn||btn.dataset.safeQaReport==='1')return false;
    btn.dataset.safeQaReport='1';
    btn.onclick=()=>{
      try{inspectCurrent()}catch(error){
        console.error(error);
        if(typeof setStatus==='function')setStatus('No se pudo completar el control de calidad: '+error.message);
      }
    };
    return true;
  }

  window.ProfitMenteQAReport={normalizedReport,reportLines,renderReport,inspectCurrent,wire};
  wire();
})();
