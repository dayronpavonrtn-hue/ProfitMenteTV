(()=>{
  if(typeof document==='undefined'||!window.ProfitMenteFrameGridEngine||window.ProfitMenteFrameGrid)return;
  const E=window.ProfitMenteFrameGridEngine,$=s=>document.querySelector(s);let mounted=false;
  function fps(){return E.normalizeFps(project?.fps)}
  function audit(){return E.audit(project,{skipLocked:true})}
  function updatePlayheadStep(){const el=$('#playhead');if(el){el.step=String(E.frameDuration(fps()));el.dataset.fps=String(fps())}}
  function refresh(){
    updatePlayheadStep();const report=audit(),info=$('#frameGridInfo');if(!info)return report;
    info.textContent=report.total?`⚠ ${report.total} límite(s) fuera de fotograma${report.skippedLocked?` · ${report.skippedLocked} clip(s) bloqueado(s) omitidos`:''}`:`✓ Timeline alineada a ${report.fps} FPS${report.skippedLocked?` · ${report.skippedLocked} clip(s) bloqueado(s) sin revisar`:''}`;
    info.dataset.ok=String(report.total===0);return report;
  }
  function conform(){
    const result=E.conformProject(project,{skipLocked:true});
    if(result.changed){persist?.();drawTimeline?.();renderAt?.(Number($('#playhead')?.value)||0)}
    refresh();window.dispatchEvent(new CustomEvent('profitmente:frame-grid-conformed',{detail:result}));
    if(result.changed)setStatus?.(`Timeline alineada a ${result.fps} FPS · ${result.changed} ajuste(s)${result.skippedLocked?` · ${result.skippedLocked} clip(s) bloqueado(s) respetados`:''}`);
    else setStatus?.(`Timeline ya estaba alineada a ${result.fps} FPS${result.skippedLocked?` · ${result.skippedLocked} clip(s) bloqueado(s) respetados`:''}`);
    return result;
  }
  function mount(){
    if(mounted||$('#frameGridControls')){mounted=true;refresh();return}const fpsSelect=$('#projectFps'),props=document.querySelector('.props');if(!fpsSelect&&!props)return;
    const box=document.createElement('div');box.id='frameGridControls';box.className='frameGridControls';box.innerHTML='<button id="frameGridConformBtn" type="button" title="Alinear clips, captions, marcadores y rango al fotograma más cercano">▦ Alinear timeline a FPS</button><small id="frameGridInfo"></small>';
    const label=fpsSelect?.closest('label');label?.insertAdjacentElement('afterend',box)||props.appendChild(box);$('#frameGridConformBtn').addEventListener('click',conform);
    if(!$('#profitmenteFrameGridStyle')){const style=document.createElement('style');style.id='profitmenteFrameGridStyle';style.textContent='.frameGridControls{display:grid;gap:4px;margin:4px 0 8px}.frameGridControls button{font-size:11px}.frameGridControls small{font-size:10px;color:#aeb7c8}.frameGridControls small[data-ok="false"]{color:#ffd166}';document.head.appendChild(style)}
    mounted=true;refresh();
  }
  window.addEventListener('profitmente:framerate',()=>requestAnimationFrame(refresh));
  window.addEventListener('profitmente:project-restored',()=>requestAnimationFrame(refresh));
  window.addEventListener('profitmente:features-ready',()=>requestAnimationFrame(refresh));
  document.addEventListener('click',e=>{if(e.target.closest?.('.clip'))requestAnimationFrame(refresh)},true);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
  window.ProfitMenteFrameGrid={engine:E,audit,conform,refresh,get fps(){return fps()}};
})();
