(()=>{
  const root=typeof window!=='undefined'?window:globalThis;
  function cleanProject(project){
    return {name:String(project?.name||'ProfitMente'),format:String(project?.format||'9:16'),duration:Number(project?.duration)||0,mode:String(project?.mode||'Manual'),clips:Array.isArray(project?.clips)?project.clips.length:0};
  }
  function buildReport(project,qc){
    return {schema:'profitmente-post-render-qc/v1',createdAt:new Date().toISOString(),project:cleanProject(project),qc:structuredClone(qc||{})};
  }
  root.ProfitMentePostRenderReport={buildReport};
  if(typeof document==='undefined'||!root.ProfitMenteBundleEngine)return;
  const proto=root.ProfitMenteBundleEngine.prototype;
  if(proto.__postRenderReportInstalled)return;proto.__postRenderReportInstalled=true;
  const original=proto.qcSummary;
  function safeName(name){return String(name||'profitmente').replace(/[^a-zA-Z0-9._-]+/g,'_').slice(-120)}
  function ensureButton(){
    let b=document.querySelector('#downloadQcReportBtn');if(b)return b;
    b=document.createElement('button');b.id='downloadQcReportBtn';b.textContent='⬇ Informe QA';b.title='Descargar el último control de calidad post-render';b.hidden=true;
    const render=document.querySelector('#renderMp4Btn');render?.parentNode?.insertBefore(b,render.nextSibling);return b;
  }
  proto.qcSummary=function(qc){
    if(qc?.ok){
      const report=buildReport(typeof project!=='undefined'?project:null,qc);this.lastQcReport=report;
      try{localStorage.setItem('profitmente-last-render-qc',JSON.stringify(report))}catch{}
      const b=ensureButton();b.hidden=false;b.onclick=()=>{
        const text=JSON.stringify(this.lastQcReport||report,null,2),blob=new Blob([text],{type:'application/json'}),a=document.createElement('a');
        a.href=URL.createObjectURL(blob);a.download=`${safeName(report.project.name)}-QA.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1500);
      };
    }
    return original.call(this,qc);
  };
  const b=ensureButton();
  try{const saved=JSON.parse(localStorage.getItem('profitmente-last-render-qc')||'null');if(saved?.qc?.ok){b.hidden=false;b.onclick=()=>{const blob=new Blob([JSON.stringify(saved,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`${safeName(saved.project?.name)}-QA.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1500)}}}catch{}
})();
