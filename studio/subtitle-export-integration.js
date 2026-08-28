(()=>{
  if(typeof document==='undefined'||!window.ProfitMenteSubtitleExportEngine)return;
  const Engine=window.ProfitMenteSubtitleExportEngine,$=s=>document.querySelector(s),anchor=$('#captionBtn');if(!anchor||$('#subtitleExportGroup'))return;
  const wrap=document.createElement('div');wrap.id='subtitleExportGroup';wrap.className='subtitleExportGroup';
  wrap.innerHTML='<button id="exportSrtBtn" type="button">⬇ Subtítulos SRT</button><button id="exportVttBtn" type="button">⬇ Subtítulos VTT</button>';
  anchor.insertAdjacentElement('afterend',wrap);
  function safeName(){return String(project?.name||'profitmente').trim().replace(/[\\/:*?"<>|]+/g,'-').replace(/\s+/g,' ').slice(0,80)||'profitmente'}
  function download(kind){
    const cues=Engine.cues(project);if(!cues.length){setStatus?.('No hay captions en la pista de subtítulos para exportar');return}
    const text=kind==='srt'?Engine.srt(project):Engine.vtt(project),type=kind==='srt'?'application/x-subrip':'text/vtt',blob=new Blob([text],{type:`${type};charset=utf-8`}),a=document.createElement('a');
    a.href=URL.createObjectURL(blob);a.download=`${safeName()}.${kind}`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),0);setStatus?.(`${cues.length} subtítulo(s) exportados en ${kind.toUpperCase()}`);
  }
  $('#exportSrtBtn').onclick=()=>download('srt');$('#exportVttBtn').onclick=()=>download('vtt');
  window.ProfitMenteSubtitleExport={download,cues:()=>Engine.cues(project)};
})();
